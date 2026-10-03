import React from 'react';
import { Shield, Lock, FileText, CheckCircle2 } from 'lucide-react';

export const PrivacyPolicy: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10 text-slate-300">
      <div className="space-y-3 border-b border-slate-800 pb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
          <Shield className="w-3.5 h-3.5" />
          <span>Legal & Privacy</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">Privacy Policy</h1>
        <p className="text-slate-400 text-sm">Last updated: October 2, 2026</p>
      </div>

      <div className="space-y-8 text-sm leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">1. Overview</h2>
          <p>
            PixelCraft Pro ("we", "our", or "us") provides a browser-based suite of image optimization, document conversion, and AI productivity tools. We are committed to protecting your privacy and ensuring transparency regarding how data is handled when you use our web application.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">2. What Files You Upload</h2>
          <p>
            When using our tools, you may select or drop images, PDFs, and other digital files from your device to perform operations such as compression, resizing, format conversion, background removal, and PDF merging or splitting.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">3. Local Browser Processing</h2>
          <p>
            The vast majority of image compression, format conversion, resizing, and PDF manipulation tasks are performed <strong>locally in your web browser</strong> utilizing client-side technologies (including WebAssembly and JavaScript). Your files are processed on your device and are not permanently uploaded, stored, or archived on our servers during these local operations.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">4. AI Features & Server Communication</h2>
          <p>
            Certain advanced AI features (such as extracting slide content from video URLs or specialized processing) may communicate securely with server-side processing routes to interact with AI model APIs. Data transmitted for these specific requests is used solely for completing the requested task and is not retained or used for model training.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">5. Personal Information & Accounts</h2>
          <p>
            PixelCraft Pro does not require user registration, account creation, or login. We do not collect personal identifiers such as names, email addresses, or phone numbers unless voluntarily provided through official communication channels.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">6. Cookies & Analytics</h2>
          <p>
            We do not use tracking cookies, invasive advertising beacons, or third-party behavioral analytics services. Standard essential technical storage may be utilized solely to preserve application state or user preferences during your session.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">7. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time to reflect improvements in our tools, changes in technology, or legal requirements. Any modifications will be posted directly on this page with an updated revision date.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">8. Contact Information</h2>
          <p>
            For questions or concerns regarding this Privacy Policy, please use the contact method provided on the official PixelCraft Pro website.
          </p>
        </section>
      </div>
    </div>
  );
};
