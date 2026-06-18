// src/services/feedbackService.ts

import { createClient } from "@/lib/supabase/client";
import { Feedback } from "@/type";

const supabase = createClient();

export interface NewFeedback {
  user_id: string | null;
  nama: string | null;
  email: string | null;
  whatsapp: string;
  category: string;
  message: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
}

export const createFeedback = async (payload: NewFeedback) => {
  const { data, error } = await supabase
    .from("feedbacks")
    .insert([{ ...payload, status: "baru" }])
    .select()
    .single();
  if (error) throw error;
  return data as Feedback;
};

export const fetchFeedbacks = async (
  page: number,
  limit: number,
  statusFilter: string | null,
) => {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("feedbacks")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (statusFilter) query = query.eq("status", statusFilter);

  const { data, error, count } = await query.range(from, to);
  if (error) throw error;
  return { data: (data as Feedback[]) || [], count: count || 0 };
};

export const updateFeedbackStatus = async (
  id: number,
  status: Feedback["status"],
) => {
  const { error } = await supabase
    .from("feedbacks")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
};
