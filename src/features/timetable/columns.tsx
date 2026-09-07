import { Progress, Tag, Text, type Tone } from "@/lib/ui";
import type { ColumnDef } from "@/lib/table";
import { studioTime } from "../format";
import type { Attendee, BookingStatus, ClassSession, ClassStatus, DataMode, PaymentType } from "./types";

const STATUS_TONE: Record<ClassStatus, Tone> = { Scheduled: "info", Full: "success", Cancelled: "danger" };
const BOOKING_TONE: Record<BookingStatus, Tone> = { Booked: "info", "Checked-in": "success", Cancelled: "neutral", "No-show": "warning" };
const PAYMENT_TONE: Record<PaymentType, Tone> = { "One-time": "neutral", Package: "info", Membership: "accent" };

export function formatTimeRange(startAt: string, endAt: string): string {
  const start = studioTime(startAt);
  const end = studioTime(endAt);
  return `${start.format("ddd D MMM · HH:mm")} – ${end.format("HH:mm")}`;
}

/**
 * The timetable's column definitions. In server mode `sorter: true` makes the table emit the
 * sort change instead of sorting locally; the comparator functions are only used client-side.
 */
export function buildClassColumns(mode: DataMode): ColumnDef<ClassSession>[] {
  const server = mode === "server";
  return [
    {
      dataIndex: "name",
      title: "Class",
      fixed: "left",
      width: 220,
      ellipsis: true,
      sorter: server ? true : (a, b) => a.name.localeCompare(b.name),
      render: (name, record) => (
        <div style={{ display: "grid", lineHeight: 1.3 }}>
          <Text strong ellipsis>
            {name}
          </Text>
          <Text tone="secondary" style={{ fontSize: 12 }}>
            {record.location}
          </Text>
        </div>
      ),
    },
    {
      dataIndex: "instructor",
      title: "Instructor",
      width: 170,
      sorter: server ? true : (a, b) => a.instructor.localeCompare(b.instructor),
    },
    {
      dataIndex: "startAt",
      title: "Time",
      width: 220,
      sorter: server ? true : (a, b) => a.startAt.localeCompare(b.startAt),
      render: (startAt, record) => formatTimeRange(startAt, record.endAt),
    },
    {
      dataIndex: "bookedCount",
      title: "Attendance",
      width: 200,
      sorter: server ? true : (a, b) => a.bookedCount / a.capacity - b.bookedCount / b.capacity,
      render: (booked, record) => {
        const ratio = record.capacity === 0 ? 0 : Math.round((booked / record.capacity) * 100);
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Progress percent={ratio} width={80} height={6} aria-label={`${booked} of ${record.capacity} booked`} tone={ratio >= 100 ? "success" : ratio >= 80 ? "warning" : "info"} />
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
              {booked} / {record.capacity}
            </span>
          </div>
        );
      },
    },
    {
      dataIndex: "status",
      title: "Status",
      width: 130,
      sorter: server ? true : (a, b) => a.status.localeCompare(b.status),
      filters: [
        { text: "Scheduled", value: "Scheduled" },
        { text: "Full", value: "Full" },
        { text: "Cancelled", value: "Cancelled" },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status) => <Tag tone={STATUS_TONE[status]}>{status}</Tag>,
    },
  ];
}

export const attendeeColumns: ColumnDef<Attendee>[] = [
  {
    dataIndex: "name",
    title: "Customer",
    width: 220,
    sorter: (a, b) => a.name.localeCompare(b.name),
    render: (name, record) => (
      <div style={{ display: "grid", lineHeight: 1.3 }}>
        <span>{name}</span>
        <Text tone="secondary" style={{ fontSize: 12 }}>
          {record.email}
        </Text>
      </div>
    ),
  },
  {
    dataIndex: "paymentType",
    title: "Payment",
    width: 140,
    render: (type) => <Tag tone={PAYMENT_TONE[type]}>{type}</Tag>,
  },
  {
    dataIndex: "bookingStatus",
    title: "Booking status",
    width: 150,
    sorter: (a, b) => a.bookingStatus.localeCompare(b.bookingStatus),
    render: (status) => <Tag tone={BOOKING_TONE[status]}>{status}</Tag>,
  },
];
