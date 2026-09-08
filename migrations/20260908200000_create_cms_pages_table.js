/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const exists = await knex.schema.hasTable("cms_pages");
  if (!exists) {
    await knex.schema.createTable("cms_pages", (table) => {
      table.increments("id").primary();
      table.string("title", 255).notNullable();
      table.string("slug", 255).notNullable().unique().index();
      table.text("content").notNullable();
      table.string("status", 50).notNullable().defaultTo("published"); // 'draft' or 'published'
      table.boolean("is_active").notNullable().defaultTo(true);
      table.string("seo_title", 255).nullable();
      table.text("seo_description").nullable();
      table.text("seo_keywords").nullable();
      table.timestamps(true, true);
    });

    // Seed standard core pages so they are immediately available
    const initialPages = [
      {
        title: "About Us",
        slug: "about",
        content: `<h2>Welcome to SFC Bakers</h2>
<p>At <strong>SFC Bakers</strong>, we believe that great food starts with passion, quality ingredients, and an unwavering commitment to our craft. From fresh artisanal bakery items and golden crispy fried chicken to mouthwatering burgers, sizzlers, and handcrafted pizzas, every single order is prepared with love and served with perfection.</p>
<h3>Our Culinary Philosophy</h3>
<ul>
  <li><strong>Fresh & Authentic:</strong> Every dough is kneaded fresh daily, every spice blend is balanced to perfection, and all ingredients are sourced sustainably.</li>
  <li><strong>Handcrafted Excellence:</strong> No shortcuts. Our experienced chefs and bakers bring decades of combined culinary expertise to your table.</li>
  <li><strong>Fast & Doorstep Delivery:</strong> Hot, freshly prepared meals packed with care and delivered right to your home in record time.</li>
</ul>
<p>Whether you're celebrating a family milestone, hanging out with friends, or having a late-night feast, SFC Bakers is always here to make your moments truly delicious.</p>`,
        status: "published",
        is_active: true,
        seo_title: "About Us | SFC Bakers - Fresh, Fast & Delicious",
        seo_description: "Learn about SFC Bakers, our rich history, culinary passion, fresh ingredients, and dedication to serving the finest food.",
        seo_keywords: "sfc bakers, about us, fresh bakery, fast food, bakery restaurant",
      },
      {
        title: "Privacy Policy",
        slug: "privacy-policy",
        content: `<h2>Privacy Policy</h2>
<p><em>Last updated: September 1, 2026</em></p>
<p>Your privacy is important to SFC Bakers. This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you visit our website, mobile progressive web app (PWA), or order through our services.</p>
<h3>1. Information We Collect</h3>
<ul>
  <li><strong>Personal Details:</strong> Full name, phone number, and email address provided during registration or checkout.</li>
  <li><strong>Delivery Address:</strong> House/flat number, street name, city, postal code, and optional GPS location coordinates for accurate doorstep delivery.</li>
  <li><strong>Order History:</strong> Details of items purchased, pricing, delivery timings, applied coupons, and payment methods.</li>
  <li><strong>Technical Logs:</strong> IP address, device identifier, and session cookies required for authentication and security.</li>
</ul>
<h3>2. How We Use Your Information</h3>
<p>We use your information exclusively to process and deliver orders, send live SMS/email updates on order statuses, prevent fraud, and continuously enhance your culinary experience. We never sell your personal data to third parties.</p>
<h3>3. Payment Security</h3>
<p>All online payments are securely processed through RBI-authorized payment gateways like Razorpay with industry-standard 256-bit encryption. SFC Bakers never stores your credit/debit card numbers or bank account passwords.</p>
<h3>4. Contact Our Data Protection Officer</h3>
<p>If you have any questions or wish to delete your account data, reach out to our team at <strong>privacy@sfcbakers.com</strong> or call our customer helpline.</p>`,
        status: "published",
        is_active: true,
        seo_title: "Privacy Policy | SFC Bakers",
        seo_description: "Read the Privacy Policy of SFC Bakers to understand how we collect, protect, and use your personal information.",
        seo_keywords: "privacy policy, data protection, sfc bakers privacy, user security",
      },
      {
        title: "Terms and Conditions",
        slug: "terms",
        content: `<h2>Terms & Conditions</h2>
<p><em>Last updated: September 1, 2026</em></p>
<p>Welcome to SFC Bakers. By accessing our platform, creating an account, or ordering items for delivery or takeout, you agree to comply with and be bound by the following Terms and Conditions.</p>
<h3>1. Account & Security</h3>
<p>You agree to provide accurate, up-to-date information when creating an account or placing guest orders. You are responsible for keeping your login credentials confidential and for all activities that occur under your account.</p>
<h3>2. Orders and Pricing</h3>
<ul>
  <li>All prices displayed on the website include applicable taxes unless specifically stated otherwise.</li>
  <li>Delivery charges and container/packaging charges are transparently calculated at checkout based on distance and order composition.</li>
  <li>SFC Bakers reserves the right to accept or decline orders in case of unforeseen kitchen stock outages or severe weather disruptions.</li>
</ul>
<h3>3. Cancellations & Modifications</h3>
<p>Because food preparation begins immediately upon order placement, cancellations are only accepted prior to kitchen confirmation. Once food preparation begins, orders cannot be cancelled.</p>
<h3>4. Governing Law</h3>
<p>These terms shall be governed by and construed in accordance with the laws of India. Any disputes arising hereunder shall be subject to the exclusive jurisdiction of the competent courts.</p>`,
        status: "published",
        is_active: true,
        seo_title: "Terms and Conditions | SFC Bakers",
        seo_description: "Read the Terms and Conditions for ordering food, using our services, promo codes, and dining with SFC Bakers.",
        seo_keywords: "terms and conditions, user agreement, sfc bakers terms, food ordering terms",
      },
      {
        title: "Refund Policy",
        slug: "refund-policy",
        content: `<h2>Refund & Cancellation Policy</h2>
<p><em>Last updated: September 1, 2026</em></p>
<p>At SFC Bakers, customer satisfaction is our top priority. We take every step to ensure your meals arrive hot, fresh, and accurate.</p>
<h3>1. Eligibility for Refunds</h3>
<p>You may be eligible for a full or partial refund in the following circumstances:</p>
<ul>
  <li><strong>Missing or Incorrect Items:</strong> An item you ordered was missing or prepared completely contrary to the item description.</li>
  <li><strong>Severe Quality Issues:</strong> Any verifiable quality or packaging defect reported immediately upon delivery with photographic evidence.</li>
  <li><strong>Undelivered Order:</strong> The order was cancelled by SFC Bakers due to delivery partner unavailability or extreme kitchen overload.</li>
</ul>
<h3>2. Refund Process & Timelines</h3>
<p>Once your refund claim is approved by our support team, the refund is initiated immediately to your original payment method:</p>
<ul>
  <li><strong>UPI / Wallets:</strong> 2 to 24 business hours.</li>
  <li><strong>Credit / Debit Cards & Net Banking:</strong> 3 to 7 business days depending on your bank's settlement cycle.</li>
</ul>
<h3>3. Need Assistance?</h3>
<p>Contact our support team directly within 30 minutes of receiving your order via the Support Chat on our website or email us at <strong>support@sfcbakers.com</strong>.</p>`,
        status: "published",
        is_active: true,
        seo_title: "Refund Policy | SFC Bakers",
        seo_description: "Understand our refund, return, and cancellation policies at SFC Bakers. Fast, transparent customer resolution.",
        seo_keywords: "refund policy, food cancellation, sfc bakers refund, order dispute",
      },
      {
        title: "Shipping & Delivery Policy",
        slug: "shipping-policy",
        content: `<h2>Shipping & Delivery Policy</h2>
<p><em>Last updated: September 1, 2026</em></p>
<p>SFC Bakers strives to bring delicious, piping-hot food to your doorstep in the shortest time possible.</p>
<h3>1. Delivery Radius & Timings</h3>
<p>We deliver across designated city zones between 10:00 AM and 11:30 PM, 7 days a week. Typical delivery times range from 25 to 45 minutes depending on distance, traffic conditions, and kitchen rush.</p>
<h3>2. Delivery Fees</h3>
<p>Delivery fees are dynamically calculated based on the distance in kilometers from our kitchen branch to your doorstep. Transparent fee breakdowns are displayed on the cart and checkout pages before payment.</p>
<h3>3. Delivery Address Accuracy</h3>
<p>Please double-check your flat number, building name, and landmark when placing an order. Our delivery partners will call your registered phone number upon arrival.</p>`,
        status: "published",
        is_active: true,
        seo_title: "Shipping & Delivery Policy | SFC Bakers",
        seo_description: "Information about delivery radius, timings, charges, and doorstep delivery guidelines for SFC Bakers.",
        seo_keywords: "delivery policy, shipping, sfc bakers delivery, doorstep food delivery",
      },
      {
        title: "Frequently Asked Questions (FAQ)",
        slug: "faq",
        content: `<h2>Frequently Asked Questions</h2>
<p>Find answers to common questions about ordering, delivery, menu items, and payment options at SFC Bakers.</p>
<h3>1. How do I place an order?</h3>
<p>Simply explore our online Menu, add your favorite items to your Cart, proceed to Checkout, enter your delivery address, choose your preferred payment method (UPI, Card, Net Banking, or Cash on Delivery), and place your order!</p>
<h3>2. Can I schedule an order for later?</h3>
<p>Yes! During checkout you can specify preferred delivery time windows or add special chef instructions to your order.</p>
<h3>3. Do you have vegetarian and eggless bakery items?</h3>
<p>Absolutely! All vegetarian and eggless items are prominently labeled with clear veg green badges on our menu.</p>
<h3>4. How can I track my order?</h3>
<p>Once placed, visit the <strong>My Orders</strong> section in your profile to view live status updates from "Confirmed", "Preparing in Kitchen", to "Out for Delivery".</p>`,
        status: "published",
        is_active: true,
        seo_title: "FAQ | SFC Bakers - Frequently Asked Questions",
        seo_description: "Answers to frequently asked questions about orders, deliveries, menu options, and payments at SFC Bakers.",
        seo_keywords: "faq, sfc bakers questions, help center, food ordering faq",
      },
    ];

    await knex("cms_pages").insert(initialPages);
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("cms_pages");
};

