import {
  CalendarDays,
  Globe,
  LayoutDashboard,
  type LucideIcon,
  Package,
  ReceiptText,
  Settings,
  Users,
} from "lucide-react";

export type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  /** One line shown under the page title. */
  description: string;
};

export type NavGroup = { label: string; items: NavItem[] };

// The whole admin menu. 11 tabs in the old Espace OA → these 7 entries.
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Gestion",
    items: [
      {
        title: "Tableau de bord",
        url: "/admin",
        icon: LayoutDashboard,
        description: "Ce qui se passe aujourd'hui et cette semaine.",
      },
      {
        title: "Calendrier",
        url: "/admin/calendrier",
        icon: CalendarDays,
        description: "Commandes et blocages, stock restant jour par jour.",
      },
      {
        title: "Commandes",
        url: "/admin/commandes",
        icon: ReceiptText,
        description: "Commandes du site et commandes manuelles.",
      },
      {
        title: "Matériel",
        url: "/admin/materiel",
        icon: Package,
        description: "Stock, prix, photos et disponibilités de chaque produit.",
      },
      {
        title: "Clients",
        url: "/admin/clients",
        icon: Users,
        description: "Comptes clients et messages reçus.",
      },
    ],
  },
  {
    label: "Site",
    items: [
      {
        title: "Site",
        url: "/admin/site",
        icon: Globe,
        description: "Catalogue, réalisations et apparence du site.",
      },
    ],
  },
];

export const SETTINGS_ITEM: NavItem = {
  title: "Réglages",
  url: "/admin/reglages",
  icon: Settings,
  description: "Livraison, paiement, e-mails.",
};

const ALL = [...NAV_GROUPS.flatMap((g) => g.items), SETTINGS_ITEM];

export function findNavItem(pathname: string): NavItem | undefined {
  if (pathname === "/admin" || pathname === "/admin/") return ALL[0];
  return ALL.filter((i) => i.url !== "/admin").find((i) => pathname.startsWith(i.url));
}

export function isActive(item: NavItem, pathname: string) {
  return item.url === "/admin" ? pathname === "/admin" : pathname.startsWith(item.url);
}
