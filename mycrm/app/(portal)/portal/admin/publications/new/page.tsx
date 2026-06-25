"use client";
import { useRouter } from "next/navigation";
import AdminPublicationForm from "../_form";

export default function NewAdminPublicationPage() {
  const router = useRouter();
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">New Publication</h1>
        <p className="text-sm text-gray-500 mt-0.5">Create a new post, event or announcement</p>
      </div>
      <AdminPublicationForm onSaved={id => router.push(`/portal/admin/publications/${id}`)} />
    </div>
  );
}
