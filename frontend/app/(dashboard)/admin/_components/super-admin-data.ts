import type { Houseboat, User } from "@/types";

export const adminBoatImages = [
  "https://images.unsplash.com/photo-1605281317010-fe5ffe798166?w=900&q=80",
  "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=900&q=80",
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&q=80",
  "https://images.unsplash.com/photo-1523496922380-91d5afba98a3?w=900&q=80",
];

export const fallbackBoats = [
  {
    _id: "demo-1",
    name: "Water Lily Prime",
    location: "Tahirpur Zone",
    logoUrl: adminBoatImages[0],
    ownerId: { name: "Ahmed Razzaq", email: "", phone: "" } as User,
    holdTimeoutMinutes: 60,
    isOperational: true,
    approvedAgents: [],
    createdAt: new Date().toISOString(),
  },
  {
    _id: "demo-2",
    name: "Emerald Voyager",
    location: "Main Ghat",
    logoUrl: adminBoatImages[1],
    ownerId: { name: "Sofia Karim", email: "", phone: "" } as User,
    holdTimeoutMinutes: 60,
    isOperational: false,
    approvedAgents: [],
    createdAt: new Date().toISOString(),
  },
  {
    _id: "demo-3",
    name: "Sapphire Suites",
    location: "Tahirpur Zone",
    logoUrl: adminBoatImages[2],
    ownerId: { name: "Zahir Uddin", email: "", phone: "" } as User,
    holdTimeoutMinutes: 60,
    isOperational: true,
    approvedAgents: [],
    createdAt: new Date().toISOString(),
  },
] satisfies Houseboat[];

export const platformAlerts = [
  {
    id: "revenue",
    title: "Revenue Latency Detected",
    time: "1 hour ago",
    body: 'Payment synchronization delayed for 14 transactions from "Tanguar King" fleet. Estimated $1,200 pending reconciliation.',
    tone: "critical",
    action: "Fix Issue",
    link: "View Logs",
  },
  {
    id: "registration",
    title: "New Boat Registration",
    time: "3 hours ago",
    body: 'Operator "Mahbub Ahmed" has registered a new houseboat: Blue Water Pearl. Pending document verification.',
    tone: "gold",
    action: "Verify Now",
  },
  {
    id: "audit",
    title: "Weekly Performance Audit",
    time: "Dec 12, 10:30 PM",
    body: "The system completed the weekly health check. Server uptime: 99.98%. All database clusters are optimal.",
    tone: "soft",
    action: "Download PDF Report",
  },
  {
    id: "update",
    title: "Scheduled System Update",
    time: "Dec 12, 02:15 PM",
    body: "Version 1.0.5 deployment scheduled for Sunday at 02:00 AM. Estimated downtime: 15 minutes.",
    tone: "purple",
    action: "Details",
  },
];
