import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Users, CheckCircle, XCircle, Clock } from "lucide-react";
import { blink } from "@/blink/client";
import type { User, Class, AttendanceRecord } from "@/types";

interface TeacherDashboardProps {
  user: User;
}

export function TeacherDashboard({ user }: TeacherDashboardProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const loadClasses = useCallback(async () => {
    try {
      const classData = await blink.db.classes.list({
        where: { teacher_id: user.id }
      });
      setClasses(classData);
      if (classData.length > 0) {
        setSelectedClass(classData[0].id);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  }, [user.id]);

  const loadStudents = useCallback(async () => {
    try {
      const studentData = await blink.db.users.list({
        where: { 
          role: 'student',
          class_id: selectedClass
        }
      });
      setStudents(studentData);
    } catch (error) {
      console.error('Error loading students:', error);
    }
  }, [selectedClass]);

  const loadAttendance = useCallback(async () => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const attendanceData = await blink.db.attendance.list({
        where: {
          class_id: selectedClass,
          date: dateStr
        }
      });
      setAttendance(attendanceData);
    } catch (error) {
      console.error('Error loading attendance:', error);
    }
  }, [selectedClass, selectedDate]);

  const markAttendance = async (studentId: string, status: 'present' | 'absent' | 'late') => {
    setLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const attendanceId = `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Check if attendance already exists
      const existing = attendance.find(a => a.student_id === studentId);
      
      if (existing) {
        // Update existing attendance
        await blink.db.attendance.update(existing.id, { status });
      } else {
        // Create new attendance record
        await blink.db.attendance.create({
          id: attendanceId,
          student_id: studentId,
          class_id: selectedClass,
          date: dateStr,
          status,
          marked_by: user.id,
          created_at: new Date().toISOString()
        });
      }
      
      await loadAttendance();
    } catch (error) {
      console.error('Error marking attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    if (selectedClass) {
      loadStudents();
      loadAttendance();
    }
  }, [selectedClass, selectedDate, loadStudents, loadAttendance]);

  const getAttendanceStatus = (studentId: string) => {
    const record = attendance.find(a => a.student_id === studentId);
    return record?.status || null;
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'present': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'absent': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'late': return <Clock className="h-4 w-4 text-yellow-600" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'absent': return 'bg-red-100 text-red-800';
      case 'late': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const stats = {
    total: students.length,
    present: attendance.filter(a => a.status === 'present').length,
    absent: attendance.filter(a => a.status === 'absent').length,
    late: attendance.filter(a => a.status === 'late').length
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teacher Dashboard</h1>
          <p className="text-gray-600">Manage attendance for your classes</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.present}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Late</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.late}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CalendarDays className="h-5 w-5" />
              <span>Select Date</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        {/* Attendance Management */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Mark Attendance</CardTitle>
                <CardDescription>
                  {selectedDate.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </CardDescription>
              </div>
              
              {classes.length > 1 && (
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {students.map((student) => {
                const status = getAttendanceStatus(student.id);
                return (
                  <div key={student.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {student.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{student.name}</p>
                        <p className="text-sm text-gray-500">{student.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {status && (
                        <Badge className={getStatusColor(status)}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(status)}
                            <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
                          </div>
                        </Badge>
                      )}
                      
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant={status === 'present' ? 'default' : 'outline'}
                          onClick={() => markAttendance(student.id, 'present')}
                          disabled={loading}
                          className="text-xs"
                        >
                          Present
                        </Button>
                        <Button
                          size="sm"
                          variant={status === 'late' ? 'default' : 'outline'}
                          onClick={() => markAttendance(student.id, 'late')}
                          disabled={loading}
                          className="text-xs"
                        >
                          Late
                        </Button>
                        <Button
                          size="sm"
                          variant={status === 'absent' ? 'destructive' : 'outline'}
                          onClick={() => markAttendance(student.id, 'absent')}
                          disabled={loading}
                          className="text-xs"
                        >
                          Absent
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {students.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No students found in this class</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}