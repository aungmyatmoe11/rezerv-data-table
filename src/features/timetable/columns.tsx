import { Progress, Tag, Typography } from "antd";
import dayjs from "dayjs";
import type { ColumnDef } from "@/lib/table";
import type { Attendee, BookingStatus, ClassSession, ClassStatus, DataMode, PaymentType } from "./types";

const STATUS_COLOR: Record<ClassStatus, string> = { Scheduled: "processing", Full: "success", Cancelled: "error" };
const BOOKING_COLOR: Record<BookingStatus, string> = { Booked: "processing", "Checked-in": "success", Cancelled: "default", "No-show": "warning" };
const PAYMENT_COLOR: Record<PaymentType, string> = { "One-time": "default", Package: "geekblue", Membership: "purple" };

export function formatTimeRange(startAt: string, endAt: string): string {
  const start = dayjs(startAt);
  const end = dayjs(endAt);
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
          <Typography.Text strong ellipsis>
            {name}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {record.location}
          </Typography.Text>
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
            <Progress percent={ratio} size={[80, 6]} showInfo={false} status={ratio >= 100 ? "success" : "normal"} {...(ratio >= 80 && ratio < 100 ? { strokeColor: "#d48806" } : {})} style={{ margin: 0, width: 80 }} />
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
      render: (status) => <Tag color={STATUS_COLOR[status]}>{status}</Tag>,
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
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {record.email}
        </Typography.Text>
      </div>
    ),
  },
  {
    dataIndex: "paymentType",
    title: "Payment",
    width: 140,
    render: (type) => <Tag color={PAYMENT_COLOR[type]}>{type}</Tag>,
  },
  {
    dataIndex: "bookingStatus",
    title: "Booking status",
    width: 150,
    sorter: (a, b) => a.bookingStatus.localeCompare(b.bookingStatus),
    render: (status) => <Tag color={BOOKING_COLOR[status]}>{status}</Tag>,
  },
];
