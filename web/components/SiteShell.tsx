"use client";

import {
  Activity,
  ArrowUpRight,
  Menu,
  Shield,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navigation = [
  { href: "/", label: "Overview" },
  { href: "/quote", label: "Quote" },
  { href: "/risk", label: "Risk" },
  { href: "/failure", label: "Failure rules" },
  { href: "/triage", label: "Triage" },
  { href: "/forecast", label: "Forecast" },
  { href: "/analytics", label: "Analytics" },
  { href: "/about", label: "About" },
];

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Aegis Logistics home">
          <span className="brand-mark">
            <Shield aria-hidden="true" />
          </span>
          <span className="brand-name">
            AEGIS <small>LOGISTICS</small>
          </span>
        </Link>
        <button
          className="mobile-menu"
          type="button"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          aria-controls="primary-navigation"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X /> : <Menu />}
        </button>
        <nav
          className={`nav-links${open ? " open" : ""}`}
          id="primary-navigation"
          aria-label="Primary navigation"
        >
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="network-status">
          <i />
          <span>NETWORK LIVE</span>
          <Activity size={13} aria-hidden="true" />
        </div>
      </header>
      <main id="main" key={pathname} className="page-transition">
        {children}
      </main>
      <footer className="footer">
        <div className="footer-main">
          <div className="footer-statement">
            <Link className="brand footer-brand" href="/">
              <span className="brand-mark">
                <Shield aria-hidden="true" />
              </span>
              <span className="brand-name">
                AEGIS <small>LOGISTICS</small>
              </span>
            </Link>
            <p>
              Every delivery is predictable — what it costs, when it arrives,
              and what to do if something goes wrong.
            </p>
          </div>
          <div className="footer-column">
            <span className="section-label">MODEL LAB</span>
            <Link href="/guide">Model field guide</Link>
            <Link href="/quote">Cost &amp; ETA</Link>
            <Link href="/risk">Delay risk</Link>
            <Link href="/failure">Failure rules</Link>
            <Link href="/triage">Ticket triage</Link>
            <Link href="/forecast">Hub forecast</Link>
          </div>
          <div className="footer-column">
            <span className="section-label">OPERATIONS</span>
            <Link href="/analytics">Model scorecard</Link>
            <Link href="/about">About the data</Link>
            <a href={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/health`} target="_blank" rel="noreferrer">
              API status <ArrowUpRight size={12} />
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© AEGIS LOGISTICS · MODEL LAB</span>
          <span>REAL CSV DATA · HUMAN OVERSIGHT REQUIRED</span>
          <span>REGIONAL PARCEL NETWORK / 04</span>
        </div>
      </footer>
    </>
  );
}
