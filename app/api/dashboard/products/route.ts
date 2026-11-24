
import { NextRequest, NextResponse } from "next/server";
import {
  DeleteObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

import { prisma } from "@/lib/prisma";
import { getDashboardAdmin } from "@/lib/dashboard-admin";
import { buildDefaultProductDescription } from "@/lib/product-description";
import {
  s3,
  storageBucket,
  getPublicObjectUrl,
} from "@/lib/storage";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

type UploadedObject = {
  key: string;
};

type AttributeSelection = {
  attributeId: string;
  termIds: string[];
};

type VariationInput = {
  sku?: string;
  attributes: Record<
    string,
    {
      id: string;
      value: string;
      sizeSymbol?: string | null;
    }
  >;
  regularPrice: string;
  salePrice: string;
  stock: string;
};

function parseJSON<T>(value: FormDataEntryValue | null, fallback: T): T {
  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }

  return JSON.parse(value) as T;
}

function parseAmount(value: string, field: string): number {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`Enter a valid ${field}.`);
  }

  return amount;
}

function parseStock(value: string, field: string): number {
  const stock = Number(value);

  if (!Number.isInteger(stock) || stock < 0) {
    throw new Error(`Enter a valid ${field}.`);
  }

  return stock;
}

async function uploadProductImage(
  file: File,
  altText: string,
  sortOrder: number
) {
  const extension = ALLOWED_IMAGE_TYPES[file.type];

  if (!extension) {
    throw new Error("Only JPG, PNG and WEBP images are allowed.");
  }

  if (file.size === 0 || file.size > MAX_IMAGE_SIZE) {
    throw new Error("Each product image must be smaller than 5 MB.");
  }

  const key = `products/${randomUUID()}.${extension}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: storageBucket,
      Key: key,
      Body: Buffer.from(await file.arrayBuffer()),
      ContentType: file.type,
      ContentLength: file.size,
      CacheControl: "public, max-age=31536000",
    })
  );

  return {
    key,
    url: getPublicObjectUrl(key),
    altText: altText.trim() || null,
    isPrimary: sortOrder === 0,
    sortOrder,
  };
}

async function deleteUploadedObjects(objects: UploadedObject[]) {
  await Promise.allSettled(
    objects.map(({ key }) =>
      s3.send(
        new DeleteObjectCommand({
          Bucket: storageBucket,
          Key: key,
        })
      )
    )
  );
}

// ─────────────────────────────────────────────
// GET PRODUCTS
// ─────────────────────────────────────────────

export async function GET() {
  try {
    const auth = await getDashboardAdmin();

    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        price: true,
        comparePrice: true,
        status: true,
        isActive: true,
        createdAt: true,

        images: {
          select: {
            id: true,
            url: true,
            altText: true,
            isPrimary: true,
            sortOrder: true,
          },
          orderBy: {
            sortOrder: "asc",
          },
        },

        categories: {
          select: {
            category: {
              select: {
                name: true,
              },
            },
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error("Products GET error:", error);

    return NextResponse.json(
      { error: "Unable to load products." },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────
// CREATE PRODUCT
// ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const uploadedObjects: UploadedObject[] = [];

  try {
    const auth = await getDashboardAdmin();

    if ("error" in auth) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const formData = await request.formData();

    // Product information
    const name = String(formData.get("name") || "").trim();
    const slug = String(formData.get("slug") || "").trim();
    const submittedDescription = String(formData.get("description") || "").trim();
    const description = submittedDescription || buildDefaultProductDescription(name);
    const sku = String(formData.get("sku") || "").trim();

    const regularPrice = parseAmount(
      String(formData.get("comparePrice") || formData.get("price") || ""),
      "regular price"
    );

    const submittedPrice = parseAmount(
      String(formData.get("price") || ""),
      "product price"
    );

    const stock = parseStock(
      String(formData.get("stock") || "0"),
      "product stock"
    );

    const status = String(formData.get("status") || "DRAFT");

    if (!name) {
      return NextResponse.json(
        { error: "Product title is required." },
        { status: 400 }
      );
    }

    if (!slug) {
      return NextResponse.json(
        { error: "Product permalink is required." },
        { status: 400 }
      );
    }

    if (!["DRAFT", "ACTIVE"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid product status." },
        { status: 400 }
      );
    }

    const isActive = status === "ACTIVE";

    if (submittedPrice > regularPrice && formData.get("comparePrice")) {
      return NextResponse.json(
        { error: "Sale price cannot be greater than regular price." },
        { status: 400 }
      );
    }

    const price = submittedPrice;
    const comparePrice = formData.get("comparePrice")
      ? regularPrice
      : null;

    // Parse submitted selections
    const categoryIds = parseJSON<string[]>(
      formData.get("categoryIds"),
      []
    );

    const attributeSelections = parseJSON<AttributeSelection[]>(
      formData.get("attributeSelections"),
      []
    );

    const variations = parseJSON<VariationInput[]>(
      formData.get("variations"),
      []
    );

    const imageMetadata = parseJSON<
      { altText?: string; isPrimary?: boolean }[]
    >(
      formData.get("images"),
      []
    );

    // Validate product images
    const imageFiles = formData
      .getAll("productImages")
      .filter((value): value is File => value instanceof File);

    if (imageFiles.length > 20) {
      return NextResponse.json(
        { error: "You can upload a maximum of 20 product images." },
        { status: 400 }
      );
    }

    if (
      imageMetadata.length > 0 &&
      imageMetadata.length !== imageFiles.length
    ) {
      return NextResponse.json(
        {
          error:
            "Product image information does not match uploaded images.",
        },
        { status: 400 }
      );
    }

    // Validate variation requirements
    if (attributeSelections.length > 0 && variations.length === 0) {
      return NextResponse.json(
        { error: "Generate product variations before saving." },
        { status: 400 }
      );
    }

    const selectedTermIds = [
      ...new Set(
        attributeSelections.flatMap((selection) => selection.termIds)
      ),
    ];

    if (
      attributeSelections.some(
        (selection) =>
          !selection.attributeId ||
          !Array.isArray(selection.termIds) ||
          selection.termIds.length === 0
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Select at least one term for each selected attribute.",
        },
        { status: 400 }
      );
    }

    // Check duplicate product SKU
    if (sku) {
      const existingSku = await prisma.product.findUnique({
        where: { sku },
        select: { id: true },
      });

      if (existingSku) {
        return NextResponse.json(
          { error: "This product SKU is already in use." },
          { status: 409 }
        );
      }
    }

    // Check duplicate permalink
    const existingSlug = await prisma.product.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existingSlug) {
      return NextResponse.json(
        { error: "This product permalink is already in use." },
        { status: 409 }
      );
    }

    // Validate categories
    const uniqueCategoryIds = [...new Set(categoryIds)];

    if (uniqueCategoryIds.length > 0) {
      const existingCategories = await prisma.category.findMany({
        where: {
          id: { in: uniqueCategoryIds },
          isActive: true,
        },
        select: { id: true },
      });

      if (existingCategories.length !== uniqueCategoryIds.length) {
        return NextResponse.json(
          { error: "One or more selected categories are invalid." },
          { status: 400 }
        );
      }
    }

    // Validate selected attributes and terms
    if (selectedTermIds.length > 0) {
      const uniqueAttributeIds = [
        ...new Set(attributeSelections.map((item) => item.attributeId)),
      ];

      const existingTerms = await prisma.attributeValue.findMany({
        where: {
          id: { in: selectedTermIds },
          attributeId: { in: uniqueAttributeIds },
        },
        select: {
          id: true,
          attributeId: true,
        },
      });

      if (existingTerms.length !== selectedTermIds.length) {
        return NextResponse.json(
          {
            error: "One or more selected attribute terms are invalid.",
          },
          { status: 400 }
        );
      }

      for (const selection of attributeSelections) {
        const matchingTerms = existingTerms.filter(
          (term) => term.attributeId === selection.attributeId
        );

        if (matchingTerms.length !== selection.termIds.length) {
          return NextResponse.json(
            {
              error: "Attribute selections do not match their terms.",
            },
            { status: 400 }
          );
        }
      }
    }

    // Validate each variation
    const allowedTermIds = new Set(selectedTermIds);

    const validatedVariations = variations.map((variation) => {
      if (
        !variation.attributes ||
        typeof variation.attributes !== "object"
      ) {
        throw new Error("Invalid variation attributes.");
      }

      const terms = Object.values(variation.attributes);

      if (
        terms.length !== attributeSelections.length ||
        terms.some(
          (term) => !term.id || !allowedTermIds.has(term.id)
        )
      ) {
        throw new Error(
          "A variation contains an invalid attribute selection."
        );
      }

      const regular = parseAmount(
        variation.regularPrice,
        "variation regular price"
      );

      const sale = variation.salePrice
        ? parseAmount(variation.salePrice, "variation sale price")
        : regular;

      if (sale > regular) {
        throw new Error(
          "Variation sale price cannot be greater than regular price."
        );
      }

      const variationStock = parseStock(
        variation.stock,
        "variation stock"
      );

      const variationSku = String(variation.sku || "").trim();

      if (!variationSku) {
        throw new Error("Every variation must have a SKU.");
      }

      return {
        name: terms.map((term) => term.value).join(" / "),
        sku: variationSku,
        price: sale,
        comparePrice: sale < regular ? regular : null,
        stock: variationStock,
        attributes: variation.attributes,
      };
    });

    const variationSkus = validatedVariations.map(
      (variation) => variation.sku
    );

    if (new Set(variationSkus).size !== variationSkus.length) {
      return NextResponse.json(
        { error: "Variation SKUs must be unique." },
        { status: 400 }
      );
    }

    if (sku && variationSkus.includes(sku)) {
      return NextResponse.json(
        {
          error: "Product SKU and variation SKUs must be different.",
        },
        { status: 400 }
      );
    }

    // Upload product images to Neon Object Storage
    // Explicit type fixes the TypeScript implicit any[] error.
    const uploadedImages: Awaited<
      ReturnType<typeof uploadProductImage>
    >[] = [];

    for (let index = 0; index < imageFiles.length; index++) {
      const metadata = imageMetadata[index];

      const uploaded = await uploadProductImage(
        imageFiles[index],
        metadata?.altText || imageFiles[index].name,
        index
      );

      uploadedObjects.push({ key: uploaded.key });
      uploadedImages.push(uploaded);
    }

    // Create product and related records
    const product = await prisma.$transaction(async (tx) => {
      const createdProduct = await tx.product.create({
        data: {
          name,
          slug,
          description: description || null,
          sku: sku || null,

          price,
          comparePrice,

          status: status as "DRAFT" | "ACTIVE",
          isActive,
          publishedAt: isActive ? new Date() : null,

          images: {
            create: uploadedImages.map((image) => ({
              storageKey: image.key,
              url: image.url,
              altText: image.altText,
              isPrimary: image.isPrimary,
              sortOrder: image.sortOrder,
            })),
          },

          categories: {
            create: uniqueCategoryIds.map((categoryId) => ({
              categoryId,
            })),
          },

          attributes: {
            create: selectedTermIds.map((attributeValueId) => ({
              attributeValueId,
            })),
          },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          sku: true,
        },
      });

      // Products without variations use product-level inventory
      if (validatedVariations.length === 0) {
        await tx.inventory.create({
          data: {
            productId: createdProduct.id,
            quantity: stock,
          },
        });
      }

      // Create individual variations and their inventories
      for (const variation of validatedVariations) {
        await tx.productVariant.create({
          data: {
            productId: createdProduct.id,
            name: variation.name,
            sku: variation.sku,

            price: variation.price,
            comparePrice: variation.comparePrice,

            stock: variation.stock,
            attributes: variation.attributes,

            isActive: true,

            inventory: {
              create: {
                productId: createdProduct.id,
                quantity: variation.stock,
              },
            },
          },
        });
      }

      return createdProduct;
    });

    return NextResponse.json(
      {
        message: "Product created successfully.",
        product,
      },
      { status: 201 }
    );
  } catch (error) {
    // Remove uploaded images if database creation fails
    await deleteUploadedObjects(uploadedObjects);

    console.error("Products POST error:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid product information was submitted." },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (
        error.message.includes("SKU") ||
        error.message.includes("permalink") ||
        error.message.includes("price") ||
        error.message.includes("stock") ||
        error.message.includes("attribute") ||
        error.message.includes("variation") ||
        error.message.includes("image") ||
        error.message.includes("category")
      ) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        error: "Unable to create product. Please try again.",
      },
      { status: 500 }
    );
  }
}
