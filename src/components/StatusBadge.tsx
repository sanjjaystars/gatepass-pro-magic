interface StatusBadgeProps {
  status: 'pending' | 'approved' | 'rejected';
}

const labels = {
  pending: '🟡 Pending',
  approved: '🟢 Approved',
  rejected: '🔴 Rejected',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`status-${status} inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold`}>
      {labels[status]}
    </span>
  );
}
