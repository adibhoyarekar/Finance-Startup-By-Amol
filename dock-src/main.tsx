import { createRoot } from "react-dom/client";
import {
  IconHome,
  IconCurrencyDollar,
  IconFileText,
  IconMail,
} from "@tabler/icons-react";
import { FloatingDock } from "./floating-dock";

const cls = "h-full w-full text-white";
const items = [
  { title: "Home", icon: <IconHome className={cls} />, href: "index.html" },
  { title: "Funding & Loans", icon: <IconCurrencyDollar className={cls} />, href: "funding-loans.html" },
  { title: "Registration", icon: <IconFileText className={cls} />, href: "registration.html" },
  { title: "Contact", icon: <IconMail className={cls} />, href: "contact.html" },
];

const el = document.getElementById("floating-dock-root");
if (el) createRoot(el).render(<FloatingDock items={items} desktopClassName="dock-glass" mobileClassName="dock-glass-mobile" />);
