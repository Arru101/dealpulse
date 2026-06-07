'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { Mail, Phone, MapPin, CheckCircle, ShieldCheck } from 'lucide-react';

export default function LegalPage() {
  const { slug } = useParams();

  // Contact Form States
  const [cName, setCName] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cMsg, setCMsg] = useState('');
  const [cSuccess, setCSuccess] = useState(false);

  const handleContactSubmit = (e) => {
    e.preventDefault();
    setCSuccess(true);
    setCName('');
    setCEmail('');
    setCMsg('');
    setTimeout(() => setCSuccess(false), 5000);
  };

  const getDocTitle = () => {
    switch (slug) {
      case 'privacy-policy': return 'Privacy Policy';
      case 'terms-conditions': return 'Terms & Conditions';
      case 'terms-of-service': return 'Terms of Service';
      case 'cookie-policy': return 'Cookie Policy';
      case 'affiliate-disclosure': return 'Affiliate Disclosure';
      case 'disclaimer': return 'Disclaimer';
      case 'refund-policy': return 'Refund Policy';
      case 'contact-us': return 'Contact Us';
      case 'about-us': return 'About Us';
      case 'gdpr-information': return 'GDPR Data Information';
      case 'data-deletion-request': return 'Data Deletion Request';
      case 'user-account-deletion': return 'User Account Deletion';
      default: return 'Legal Document';
    }
  };

  const renderContent = () => {
    switch (slug) {
      case 'privacy-policy':
        return (
          <div>
            <p><strong>Last Updated: June 2026</strong></p>
            <br />
            <h3>1. Introduction</h3>
            <p>Welcome to ShopperAffiliate India. We are committed to protecting your privacy in compliance with the Indian Information Technology Act, 2000 (IT Act) and GDPR guidelines.</p>
            <br />
            <h3>2. Information We Collect</h3>
            <p>We collect minimal personal data including display names, emails (via Google login), and click tracking statistics (referrers, browser versions, and timestamp markers). Outbound click data logs do not contain financial information.</p>
            <br />
            <h3>3. Cookies & Analytics</h3>
            <p>We utilize essential, functional, and tracking cookies to attribute commissions from merchant sales. Analytics cookies allow us to monitor server health and trending algorithm scores. You can manage preferences using our cookie control banner.</p>
            <br />
            <h3>4. Third-Party Marketplace Links</h3>
            <p>Our website contains links directing to third-party merchant sites (such as Amazon.in, Flipkart, and Ajio). We hold no ownership or liability for their privacy frameworks or terms of service.</p>
          </div>
        );

      case 'terms-conditions':
      case 'terms-of-service':
        return (
          <div>
            <p><strong>Last Updated: June 2026</strong></p>
            <br />
            <h3>1. Acceptance of Terms</h3>
            <p>By browsing ShopperAffiliate India, you agree to comply with our Terms of Service. These terms are governed under Indian Law with jurisdiction in Mumbai, India.</p>
            <br />
            <h3>2. Description of Service</h3>
            <p>ShopperAffiliate is a discovery and price comparison engine. We do not handle checkouts, credit cards, or direct transactions. All purchase queries, refunds, and delivery inquiries must be addressed to the respective merchant store where the purchase occurred.</p>
            <br />
            <h3>3. Prohibited Activities</h3>
            <p>Users must not attempt to scrape pricing tables, inject malicious code into Express routing endpoints, or generate mock click metadata.</p>
          </div>
        );

      case 'cookie-policy':
        return (
          <div>
            <p><strong>Last Updated: June 2026</strong></p>
            <br />
            <p>This policy details our usage of cookies under Indian IT regulations and international data standards.</p>
            <br />
            <h3>1. What are Cookies?</h3>
            <p>Cookies are small text documents stored on your terminal device when browsing web portals.</p>
            <br />
            <h3>2. How We Use Cookies</h3>
            <p>We use essential cookies to maintain secure sessions. Functional cookies preserve theme choices (Light/Dark). Tracking cookies associate outbound clicks with affiliate networks (such as Amazon Associates) to generate commissions.</p>
          </div>
        );

      case 'affiliate-disclosure':
        return (
          <div>
            <p><strong>Required Compliance Notice</strong></p>
            <br />
            <p>ShopperAffiliate India operates strictly as an affiliate product discovery engine. We receive financial compensation via affiliate commissions when shoppers navigate to external online shops and complete transactions.</p>
            <br />
            <h3>Amazon Associates Policy</h3>
            <p>As an Amazon Associate, we earn commission fees from qualifying purchases made on Amazon.in. We are not owners, employees, or authorized agents of Amazon. Pricing, stock listings, and deals shown on our portal are snapshots and are subject to immediate adjustments on Amazon&rsquo;s platform.</p>
          </div>
        );

      case 'disclaimer':
        return (
          <div>
            <p><strong>Legal Disclaimer</strong></p>
            <br />
            <p>All information provided on ShopperAffiliate India is for informational and comparison purposes only. While we attempt to sync pricing, descriptions, and stock tags, errors may happen. We make no warranty regarding product quality, accuracy, safety, or legality. Purchase transactions are solely between you and the respective merchant.</p>
          </div>
        );

      case 'refund-policy':
        return (
          <div>
            <h3>Refund and Return Framework</h3>
            <br />
            <p>Since ShopperAffiliate India is a product comparison portal and <strong>never processes payments or sales directly</strong>, we do not issue refunds, cancel orders, or manage returns. All transactional complaints must be addressed directly to the marketplace customer support where you completed the checkout (e.g. Amazon Customer Service, Flipkart Help Desk, etc.).</p>
          </div>
        );

      case 'about-us':
        return (
          <div>
            <h3>Our Mission</h3>
            <br />
            <p>ShopperAffiliate India is a premium product discovery system launched to aid Indian shoppers in making smart online decisions. We scan multiple marketplaces (including Amazon, Flipkart, Ajio, and Myntra) to curate top deals, specifications, ratings, and discounts.</p>
            <p>We leverage modern web technologies (Next.js, Node, and Firebase) to build a fast, user-friendly, and accessible catalog.</p>
          </div>
        );

      case 'gdpr-information':
        return (
          <div>
            <h3>GDPR Compliance Matrix</h3>
            <br />
            <p>We honor the Right to Portability and Right to Erasure (Right to be Forgotten) for all users visiting our site.</p>
            <br />
            <ul>
              <li><strong>Right to View & Export:</strong> Navigate to your dashboard to download a complete copy of your profile statistics.</li>
              <li><strong>Right to Deletion:</strong> You can purge your entire profile from the database instantly via the Data & Privacy panel on your dashboard.</li>
            </ul>
          </div>
        );

      case 'data-deletion-request':
      case 'user-account-deletion':
        return (
          <div>
            <h3>Self-Service Account Purge</h3>
            <br />
            <p>To purge your account details automatically in real-time, please sign in, navigate to your <strong>User Dashboard</strong>, open the <strong>Data & Privacy (GDPR)</strong> tab, and click <strong>Request Account Deletion</strong>.</p>
            <br />
            <h3>Manual Request Form</h3>
            <p>Alternatively, you may submit a formal request to our Data Protection Officer by emailing <code>privacy@shopperaffiliate.in</code>. Manual requests are processed within 7 business days under standard IT Act compliance rules.</p>
          </div>
        );

      case 'contact-us':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
            <div>
              <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
                Have suggestions or questions about deal listings? Send us a message and our support team will reply within 24-48 hours.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Mail size={18} />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Email</p>
                    <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>support@shopperaffiliate.in</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Phone size={18} />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Phone</p>
                    <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>+91 22 2847-1900</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MapPin size={18} />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Office</p>
                    <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>Bandra Kurla Complex, Mumbai, MH, 400051</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <form onSubmit={handleContactSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Full Name</label>
                  <input 
                    type="text" 
                    placeholder="Enter name" 
                    className="form-input" 
                    value={cName}
                    onChange={(e) => setCName(e.target.value)}
                    required
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Email Address</label>
                  <input 
                    type="email" 
                    placeholder="Enter email" 
                    className="form-input" 
                    value={cEmail}
                    onChange={(e) => setCEmail(e.target.value)}
                    required
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Message</label>
                  <textarea 
                    placeholder="Describe your inquiry..." 
                    className="form-input" 
                    style={{ minHeight: '100px', resize: 'vertical' }}
                    value={cMsg}
                    onChange={(e) => setCMsg(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  Submit Inquiry
                </button>
                {cSuccess && (
                  <p style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle size={16} /> Inquiry sent successfully!
                  </p>
                )}
              </form>
            </div>
          </div>
        );

      default:
        return <p>This legal page has not been initialized yet.</p>;
    }
  };

  return (
    <div className="container" style={{ padding: '48px 24px', maxWidth: '800px', margin: '0 auto' }}>
      <div className="card" style={{ padding: '40px 32px' }}>
        <h1 className="gradient-text" style={{ fontSize: '2.2rem', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldCheck size={32} style={{ color: 'var(--primary)' }} />
          {getDocTitle()}
        </h1>
        <div style={{ lineHeight: 1.7, fontSize: '0.95rem' }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
