import { notFound } from "next/navigation";
import StorefrontHeader from "@/components/storefront/storefront-header";
import StorefrontFooter from "@/components/storefront/storefront-footer";

const policies: Record<string, { title: string; intro: string; sections: { heading: string; body: string[] }[] }> = {
  shipping: {
    title: "Shipping Policy",
    intro: "This policy explains how Hover Up prepares, dispatches and delivers orders within India.",
    sections: [
      { heading: "Order processing and production", body: ["Orders are prepared after the order details and customisation requirements have been received. Production generally takes 1–3 business days. The time may vary with order volume, bulk quantities and design requirements.", "If your order includes a custom design prepared by our team, production begins after you approve the design."] },
      { heading: "Delivery time", body: ["Shipping usually takes 5–7 business days after dispatch, depending on the delivery location and courier service. Delivery estimates are indicative and may change during festivals, public holidays, high-volume periods or courier disruptions.", "Hover Up currently ships across India. Any delivery charge or applicable shipping offer will be shown during checkout."] },
      { heading: "Order tracking", body: ["After dispatch, tracking information will be shared through the contact details provided with your order, such as WhatsApp or email, where available. You can also use the Order Tracker page on the website to check the latest order status."] },
      { heading: "Delivery assistance", body: ["Please make sure that your shipping address and contact number are accurate at checkout. If a shipment is delayed or the tracking information is not updating, contact us with your order number so we can help check the status."] }
    ]
  },
  returns: {
    title: "Returns & Refund Policy",
    intro: "We want you to be happy with your Hover Up order. This policy explains how to contact us if an order arrives damaged, defective or different from what you ordered.",
    sections: [
      { heading: "Customised and made-to-order apparel", body: ["Items printed or prepared using a customer's logo, artwork, text, sizes or other custom instructions are made for that order. These items are not eligible for a change-of-mind return once production has started, except where the item is damaged, defective or incorrect."] },
      { heading: "Damaged, defective or incorrect orders", body: ["If your order arrives damaged, defective or does not match the confirmed order details, contact Hover Up and share your order number with clear photographs and a short description of the issue. We will review the details and explain the available resolution."] },
      { heading: "Refunds and replacements", body: ["Where a return, replacement or refund is approved, our team will confirm the next steps with you. Refunds for eligible prepaid orders are processed through the applicable payment channel. For Cash on Delivery orders, our team will contact you to coordinate an appropriate resolution."] },
      { heading: "Contact us before sending an item back", body: ["Please contact us before returning any product. Unannounced returns may not be identifiable or processable."] }
    ]
  },
  privacy: {
    title: "Privacy Policy",
    intro: "Hover Up respects your privacy. This policy describes the information we collect when you browse our website, place an order or contact our team, and how that information is used.",
    sections: [
      { heading: "Information we collect", body: ["Depending on how you use the website, we may collect your name, email address, phone number, billing and delivery address, order details, selected sizes and colours, and the custom text, artwork or images you choose to submit.", "Payment transactions are handled through the payment options presented at checkout. We do not ask you to share your card PIN, OTP or banking password with our team."] },
      { heading: "How we use information", body: ["We use order and contact information to process purchases, prepare customised products, arrange delivery, provide order updates, respond to questions, prevent misuse and improve our services.", "Design files and customisation instructions are used to prepare the apparel you requested and to confirm the design with you where approval is required."] },
      { heading: "Sharing and service providers", body: ["We share only the information needed with service providers involved in completing your order, such as payment providers, delivery partners and technical services that support the website. We do not sell your personal information."] },
      { heading: "Security and retention", body: ["We use reasonable safeguards to protect information held by us. Information may be retained for as long as needed for order records, customer support, legal obligations and legitimate business purposes. No online service can guarantee absolute security."] },
      { heading: "Your choices and questions", body: ["You can contact us to ask about the personal information associated with your order or to request a correction to inaccurate contact or delivery details. Some information may need to be retained where required for transaction or legal records."] }
    ]
  },
  terms: {
    title: "Terms & Conditions",
    intro: "By browsing or placing an order on the Hover Up website, you agree to these terms. Please review your selections and order details carefully before checkout.",
    sections: [
      { heading: "Products and availability", body: ["We aim to display product descriptions, images, colours, sizes and prices as accurately as possible. Actual colours may vary slightly depending on screen settings and lighting. Product availability and specifications may change without prior notice."] },
      { heading: "Orders and payment", body: ["An order request is subject to confirmation and availability. Please provide accurate contact, size, customisation and delivery information. Available payment methods, including Cash on Delivery and online payment, are displayed at checkout.", "If we identify an issue with an order, price, stock or delivery details, we may contact you before proceeding."] },
      { heading: "Custom designs and customer content", body: ["You are responsible for ensuring that artwork, logos, photographs and text you submit are authorised for use and do not infringe another person's rights. You give Hover Up permission to use submitted content only as needed to prepare and fulfil your order.", "Where our team prepares a design from your text or idea, production begins after you approve the design. Please check spelling, colours, placement and other details in the approval carefully."] },
      { heading: "Cancellations and changes", body: ["If you need to change or cancel an order, contact us as soon as possible and include your order number. Changes may not be possible after custom production or dispatch has begun."] },
      { heading: "Website use and liability", body: ["You agree not to misuse the website, interfere with its operation or submit unlawful content. To the extent permitted by applicable law, Hover Up is not responsible for delays or interruptions caused by events outside our reasonable control, including courier or payment network disruptions."] },
      { heading: "Contact", body: ["For questions about these terms, contact Hover Up using the phone or WhatsApp details on our Contact Us page."] }
    ]
  }
};

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const policy = policies[slug];
  if (!policy) notFound();

  return (
    <>
      <StorefrontHeader />
      <main className="min-h-[65vh] bg-white px-5 py-14 text-[#171717] sm:px-8 md:py-20">
        <article className="mx-auto max-w-4xl">
          <p className="text-sm font-semibold tracking-[0.18em] text-[#987b5c]">HOVER UP CUSTOMER INFORMATION</p>
          <h1 className="mt-3 font-serif text-4xl font-bold tracking-tight sm:text-5xl">{policy.title}</h1>
          <p className="mt-6 text-lg leading-8 text-[#666]">{policy.intro}</p>
          <div className="mt-10 space-y-9">
            {policy.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-xl font-semibold">{section.heading}</h2>
                <div className="mt-3 space-y-3">{section.body.map((paragraph, index) => <p key={index} className="text-base leading-8 text-[#666]">{paragraph}</p>)}</div>
              </section>
            ))}
          </div>
        </article>
      </main>
      <StorefrontFooter />
    </>
  );
}
