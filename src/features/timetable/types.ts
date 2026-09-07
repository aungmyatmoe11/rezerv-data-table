export type ClassStatus = "Scheduled" | "Full" | "Cancelled";
export type PaymentType = "One-time" | "Package" | "Membership";
export type BookingStatus = "Booked" | "Checked-in" | "Cancelled" | "No-show";

export interface ClassSession {
  id: string;
  name: string;
  instructor: string;
  location: string;
  /** ISO 8601 */
  startAt: string;
  endAt: string;
  bookedCount: number;
  capacity: number;
  status: ClassStatus;
  /** Present only when children are delivered inline with the parent. */
  attendees?: Attendee[];
}

export interface Attendee {
  id: string;
  classId: string;
  name: string;
  email: string;
  paymentType: PaymentType;
  bookingStatus: BookingStatus;
}

export type DataMode = "client" | "server";
export type ChildrenMode = "inline" | "on-demand";
export type RowCount = 64 | 10_000;
