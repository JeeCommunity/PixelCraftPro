import React from 'react';
import { FileText, Shield, CheckCircle2, AlertCircle } from 'lucide-react';

export const Terms: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10 text-slate-300">
      <div className="space-y-3 border-b border-slate-800 pb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
          <FileText className="w-3.5 h-3.5" />
          <span>Legal & Terms</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">Terms & Conditions</h1>
        <p className="text-slate-400 text-sm">Last updated: October 2, 2026</p>
      </div>

      <div className="space-y-8 text-sm leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">1. Acceptance of Terms</h2>
          <p>
            By accessing or using PixelCraft Pro, you agree to be bound by these Terms & Conditions. If you do not agree to all of these terms, please do not use our web application or services.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">2. Use of Service</h2>
          <p>
            PixelCraft Pro provides browser-based image and document processing tools. You may use our tools for personal, educational, professional, and commercial projects in accordance with these terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">3. User Responsibility & Uploaded Files</h2>
          <p>
            You retain full ownership and intellectual property rights over any files, images, or documents you upload or process through PixelCraft Pro. You are solely responsible for ensuring that your use of our tools complies with applicable copyright laws and does not infringe upon the rights of third parties.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">4. Prohibited Misuse</h2>
          <p>
            You agree not to misuse PixelCraft Pro or assist any third party in attempting to reverse engineer, disrupt security mechanisms, overload infrastructure, transmit malicious code, or use our tools for unlawful activities.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">5. Intellectual Property</h2>
          <p>
            All source code, user interface designs, logos, graphics, and documentation associated with PixelCraft Pro are protected by intellectual property laws and remain the exclusive property of PixelCraft Pro.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">6. Availability & Modifications</h2>
          <p>
            We strive to maintain high availability of our tools, but we do not guarantee uninterrupted access. We reserve the right to modify, suspend, or discontinue any feature or tool at any time without prior notice.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">7. Limitation of Liability</h2>
          <p>
            PixelCraft Pro and its contributors shall not be held liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the application or inability to use our tools.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">8. Changes to These Terms</h2>
          <p>
            We may revise these Terms & Conditions periodically. Continued use of PixelCraft Pro after any updates constitutes your acceptance of the revised terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">9. Contact</h2>
          <p>
            For inquiries regarding these Terms & Conditions, please refer to the contact mechanism provided on our official website.
          </p>
        </section>
      </div>
    </div>
  );
};
