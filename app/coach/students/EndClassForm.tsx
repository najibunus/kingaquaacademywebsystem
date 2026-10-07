"use client";

import { useTransition } from "react";
import { endClassAction } from "@/lib/actions/attendance";
import { useRouter } from "next/navigation";

export default function EndClassForm({ classId, coachId }: { classId: string, coachId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleEndClass() {
    if (!confirm("Are you sure you want to end this class? This will finalize attendance.")) return;

    const fd = new FormData();
    fd.append("class_id", classId);
    fd.append("coach_id", coachId);

    startTransition(async () => {
      await endClassAction(fd);
      router.push("/coach/portal");
    });
  }

  return (
    <button
      onClick={handleEndClass}
      disabled={isPending}
      style={{
        padding: "12px 24px",
        backgroundColor: "var(--color-danger)",
        color: "white",
        border: "none",
        borderRadius: "8px",
        fontWeight: "bold",
        cursor: isPending ? "not-allowed" : "pointer",
        opacity: isPending ? 0.7 : 1,
        fontSize: "1rem"
      }}
    >
      {isPending ? "Ending Session..." : "End Class & Finalize"}
    </button>
  );
}
