import { NextRequest, NextResponse } from "next/server";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getDashboardAdmin } from "@/lib/dashboard-admin";
import { buildDefaultProductDescription } from "@/lib/product-description";
import { s3, storageBucket, getPublicObjectUrl } from "@/lib/storage";

type RouteContext = { params: Promise<{ id: string }> };
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

async function uploadImage(file: File, altText: string, sortOrder: number) {
  const extension = ALLOWED_IMAGE_TYPES[file.type];
  if (!extension) throw new Error("Only JPG, PNG and WEBP images are allowed.");
  if (!file.size || file.size > MAX_IMAGE_SIZE) throw new Error("Each product image must be smaller than 5 MB.");
  const key = `products/${randomUUID()}.${extension}`;
  await s3.send(new PutObjectCommand({
    Bucket: storageBucket, Key: key, Body: Buffer.from(await file.arrayBuffer()),
    ContentType: file.type, ContentLength: file.size, CacheControl: "public, max-age=31536000",
  }));
  return { storageKey: key, url: getPublicObjectUrl(key), altText: altText.trim() || null, sortOrder };
}

async function deleteObjects(keys: string[]) {
  await Promise.allSettled(keys.filter(Boolean).map((Key) =>
    s3.send(new DeleteObjectCommand({ Bucket: storageBucket, Key }))
  ));
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await getDashboardAdmin();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { id } = await context.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        categories: { include: { category: { select: { id: true, name: true, slug: true } } } },
        inventories: { where: { variantId: null }, take: 1 },
        variants: { select: { id: true } },
      },
    });
    if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });
    return NextResponse.json({ product: {
      ...product,
      price: product.price.toString(),
      comparePrice: product.comparePrice?.toString() ?? "",
      costPrice: product.costPrice?.toString() ?? "",
      stock: product.inventories[0]?.quantity ?? 0,
      categoryIds: product.categories.map((item) => item.categoryId),
      hasVariants: product.variants.length > 0,
    }});
  } catch (error) {
    console.error("Product GET error:", error);
    return NextResponse.json({ error: "Unable to load product details." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const uploadedKeys: string[] = [];
  try {
    const auth = await getDashboardAdmin();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { id } = await context.params;
    const form = await request.formData();
    const existing = await prisma.product.findUnique({
      where: { id }, include: { images: true, variants: { select: { id: true } } },
    });
    if (!existing) return NextResponse.json({ error: "Product not found." }, { status: 404 });

    const name = String(form.get("name") ?? "").trim();
    const slug = String(form.get("slug") ?? "").trim();
    const submittedDescription = String(form.get("description") ?? "").trim();
    const description = submittedDescription || buildDefaultProductDescription();
    const sku = String(form.get("sku") ?? "").trim() || null;
    const regularPrice = Number(form.get("regularPrice"));
    const salePriceText = String(form.get("salePrice") ?? "").trim();
    const salePrice = salePriceText ? Number(salePriceText) : regularPrice;
    const stock = Number(form.get("stock") ?? 0);
    const status = String(form.get("status") ?? "DRAFT");
    const categoryIds = JSON.parse(String(form.get("categoryIds") ?? "[]")) as string[];
    const retainedImages = JSON.parse(String(form.get("existingImages") ?? "[]")) as { id: string; altText?: string; isPrimary?: boolean; sortOrder?: number }[];
    const newImageMeta = JSON.parse(String(form.get("newImages") ?? "[]")) as { altText?: string }[];
    const files = form.getAll("productImages").filter((entry): entry is File => entry instanceof File);

    if (!name || !slug) return NextResponse.json({ error: "Product title and permalink are required." }, { status: 400 });
    if (!Number.isFinite(regularPrice) || regularPrice < 0 || !Number.isFinite(salePrice) || salePrice < 0 || salePrice > regularPrice) {
      return NextResponse.json({ error: "Enter valid prices. Sale price cannot exceed regular price." }, { status: 400 });
    }
    if (!Number.isInteger(stock) || stock < 0) return NextResponse.json({ error: "Enter a valid stock quantity." }, { status: 400 });
    if (!["DRAFT", "ACTIVE", "ARCHIVED"].includes(status)) return NextResponse.json({ error: "Invalid product status." }, { status: 400 });
    if (!Array.isArray(categoryIds) || !Array.isArray(retainedImages) || files.length > 20) {
      return NextResponse.json({ error: "Invalid product information or too many images." }, { status: 400 });
    }
    if (files.length !== newImageMeta.length) return NextResponse.json({ error: "Image information does not match uploaded files." }, { status: 400 });

    const [duplicateSlug, duplicateSku, validCategories] = await Promise.all([
      prisma.product.findFirst({ where: { slug, NOT: { id } }, select: { id: true } }),
      sku ? prisma.product.findFirst({ where: { sku, NOT: { id } }, select: { id: true } }) : Promise.resolve(null),
      prisma.category.findMany({ where: { id: { in: [...new Set(categoryIds)] }, isActive: true }, select: { id: true } }),
    ]);
    if (duplicateSlug) return NextResponse.json({ error: "This permalink is already in use." }, { status: 409 });
    if (duplicateSku) return NextResponse.json({ error: "This SKU is already in use." }, { status: 409 });
    if (validCategories.length !== new Set(categoryIds).size) return NextResponse.json({ error: "One or more selected categories are invalid." }, { status: 400 });

    const existingIds = new Set(existing.images.map((image) => image.id));
    if (retainedImages.some((image) => !existingIds.has(image.id))) {
      return NextResponse.json({ error: "An image does not belong to this product." }, { status: 400 });
    }
    const retainedIds = new Set(retainedImages.map((image) => image.id));
    const removedKeys = existing.images.filter((image) => !retainedIds.has(image.id)).map((image) => image.storageKey);
    const uploaded: Array<{
      storageKey: string;
      url: string;
      altText: string | null;
      sortOrder: number;
    }> = [];
    for (let i = 0; i < files.length; i++) {
      const image = await uploadImage(files[i], newImageMeta[i]?.altText || files[i].name, retainedImages.length + i);
      uploadedKeys.push(image.storageKey);
      uploaded.push(image);
    }
    const imageCount = retainedImages.length + uploaded.length;
    if (imageCount > 20) throw new Error("You can keep a maximum of 20 product images.");

    const updated = await prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id },
        data: {
          name, slug, description, sku,
          price: salePrice, comparePrice: salePrice < regularPrice ? regularPrice : null,
          status: status as "DRAFT" | "ACTIVE" | "ARCHIVED",
          isActive: status === "ACTIVE",
          publishedAt: status === "ACTIVE" ? (existing.publishedAt ?? new Date()) : existing.publishedAt,
          metaTitle: String(form.get("metaTitle") ?? "").trim() || null,
          metaDescription: String(form.get("metaDescription") ?? "").trim() || null,
          isFeatured: String(form.get("isFeatured") ?? "false") === "true",
          categories: {
            deleteMany: {},
            create: [...new Set(categoryIds)].map((categoryId) => ({ categoryId })),
          },
        },
        select: { id: true, name: true, slug: true, status: true, isActive: true },
      });

      for (const image of retainedImages) {
        await tx.productImage.update({
          where: { id: image.id },
          data: { altText: image.altText?.trim() || null, isPrimary: Boolean(image.isPrimary) || (!retainedImages.some((item) => item.isPrimary) && retainedImages[0]?.id === image.id), sortOrder: Number.isInteger(image.sortOrder) ? image.sortOrder! : 0 },
        });
      }
      await tx.productImage.deleteMany({ where: { productId: id, id: { notIn: [...retainedIds] } } });
      if (uploaded.length) {
        await tx.productImage.createMany({ data: uploaded.map((image, index) => ({
          productId: id, ...image, isPrimary: retainedImages.length === 0 && index === 0,
        })) });
      }
      if (existing.variants.length === 0) {
        const inventory = await tx.inventory.findFirst({ where: { productId: id, variantId: null } });
        if (inventory) await tx.inventory.update({ where: { id: inventory.id }, data: { quantity: stock } });
        else await tx.inventory.create({ data: { productId: id, quantity: stock } });
      }
      await tx.activityLog.create({
        data: { userId: auth.user.id, action: "PRODUCT_UPDATED", entity: "PRODUCT", entityId: id, description: "Updated product " + name, metadata: { sku, status } },
      });
      return product;
    });

    await deleteObjects(removedKeys);
    return NextResponse.json({ message: "Product updated successfully.", product: updated });
  } catch (error) {
    await deleteObjects(uploadedKeys);
    console.error("Product PUT error:", error);
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid product information was submitted." }, { status: 400 });
    if (error instanceof Error && /image|price|stock|permalink|SKU|product/i.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to update product. Please try again." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await getDashboardAdmin();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { id } = await context.params;
    const body = await request.json();
    if (typeof body.isActive !== "boolean") return NextResponse.json({ error: "A valid active status is required." }, { status: 400 });
    const existing = await prisma.product.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Product not found." }, { status: 404 });
    const product = await prisma.product.update({ where: { id }, data: { isActive: body.isActive }, select: { id: true, name: true, isActive: true, status: true } });
    return NextResponse.json({ message: body.isActive ? "Product turned on successfully." : "Product turned off successfully.", product });
  } catch (error) {
    console.error("Products PATCH error:", error);
    return NextResponse.json({ error: "Unable to update product." }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await getDashboardAdmin();
    if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { id } = await context.params;
    const existing = await prisma.product.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Product not found." }, { status: 404 });
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ message: "Product deleted successfully." });
  } catch (error) {
    console.error("Products DELETE error:", error);
    return NextResponse.json({ error: "Unable to delete product. It may be linked to existing orders or other records." }, { status: 500 });
  }
}
