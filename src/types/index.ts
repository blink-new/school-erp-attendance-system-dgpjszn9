export interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'teacher' | 'parent';
  class_id?: string;
  parent_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Class {
  id: string;
  name: string;
  grade: string;
  teacher_id?: string;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  class_id: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  marked_by: string;
  notes?: string;
  created_at: string;
}

export interface ParentChild {
  id: string;
  parent_id: string;
  child_id: string;
  created_at: string;
}

export interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  late: number;
  percentage: number;
}