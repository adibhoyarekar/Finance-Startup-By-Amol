import { createRoot } from "react-dom/client";
import { MobileNav } from "./mobile-nav";

const nav = [
  {
    name: "Menu",
    items: [
      { label: "Home", href: "index.html" },
      { label: "Funding & Loans", href: "funding-loans.html" },
      { label: "Registration", href: "registration.html" },
      { label: "Contact", href: "contact.html" },
    ],
  },
];

const el = document.getElementById("mobile-nav-root");
if (el) createRoot(el).render(<MobileNav nav={nav} />);
