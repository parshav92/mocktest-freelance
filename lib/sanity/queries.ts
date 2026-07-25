import { sanityClient } from "./client";

// ---- Hero ----
export async function getHeroSection() {
    return sanityClient.fetch(
        `*[_type == "heroSection"][0]{
            heading,
            subheading,
            primaryButtonText,
            secondaryButtonText
        }`
    );
}

// ---- Pricing Plans ----
export async function getPricingPlans() {
    return sanityClient.fetch(
        `*[_type == "pricingPlan"] | order(order asc){
            _id,
            name,
            description,
            price,
            period,
            features,
            availability,
            buttonText,
            popular,
            stripePriceId
        }`
    );
}

// ---- Testimonials ----
export async function getTestimonials() {
    return sanityClient.fetch(
        `*[_type == "testimonial"] | order(order asc){
            _id,
            name,
            role,
            content,
            rating
        }`
    );
}

// ---- FAQ ----
export async function getFaqItems() {
    return sanityClient.fetch(
        `*[_type == "faqItem"] | order(order asc){
            _id,
            question,
            answer
        }`
    );
}

// ---- About Section ----
export async function getAboutSection() {
    return sanityClient.fetch(
        `*[_type == "aboutSection"][0]{
            heading,
            description,
            stats[]{ value, label }
        }`
    );
}

// ---- Why Us Items ----
export async function getWhyUsItems() {
    return sanityClient.fetch(
        `*[_type == "whyUsItem"] | order(order asc){
            _id,
            title,
            description
        }`
    );
}

// ---- Footer Settings ----
export async function getFooterSettings() {
    return sanityClient.fetch(
        `*[_type == "footerSettings"][0]{
            email,
            facebookUrl,
            instagramUrl,
            copyrightText
        }`
    );
}
