import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, TrendingUp, CheckCircle, XCircle, Clock, Users } from "lucide-react";
import { blink } from "@/blink/client";
import type { User, AttendanceRecord, AttendanceStats, ParentChild } from "@/types";

interface ParentDashboardProps {
  user: User;
}

export function ParentDashboard({ user }: ParentDashboardProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [children, setChildren] = useState<User[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [monthlyAttendance, setMonthlyAttendance] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    percentage: 0
  });

  const loadChildren = useCallback(async () => {
    try {
      // First get parent-child relationships
      const parentChildData = await blink.db.parentChild.list({
        where: { parent_id: user.id }
      });

      if (parentChildData.length > 0) {
        // Get child user details
        const childIds = parentChildData.map(pc => pc.child_id);
        const childrenData = await blink.db.users.list({
          where: { 
            role: 'student'
          }
        });

        // Filter children that belong to this parent
        const myChildren = childrenData.filter(child => childIds.includes(child.id));
        setChildren(myChildren);
        
        if (myChildren.length > 0) {
          setSelectedChild(myChildren[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading children:', error);
    }
  }, [user.id]);

  const loadAttendance = useCallback(async () => {
    if (!selectedChild) return;
    
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const attendanceData = await blink.db.attendance.list({
        where: {
          student_id: selectedChild,
          date: dateStr
        }
      });
      setAttendance(attendanceData);
    } catch (error) {
      console.error('Error loading attendance:', error);
    }
  }, [selectedChild, selectedDate]);

  const loadMonthlyStats = useCallback(async () => {
    if (!selectedChild) return;
    
    try {
      const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
      
      const monthlyData = await blink.db.attendance.list({
        where: {
          student_id: selectedChild
        }
      });

      // Filter for current month
      const currentMonthData = monthlyData.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= startOfMonth && recordDate <= endOfMonth;
      });

      setMonthlyAttendance(currentMonthData);

      // Calculate stats
      const total = currentMonthData.length;
      const present = currentMonthData.filter(r => r.status === 'present').length;
      const absent = currentMonthData.filter(r => r.status === 'absent').length;
      const late = currentMonthData.filter(r => r.status === 'late').length;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

      setStats({ total, present, absent, late, percentage });
    } catch (error) {
      console.error('Error loading monthly stats:', error);
    }
  }, [selectedChild, selectedDate]);

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  useEffect(() => {
    if (selectedChild) {
      loadAttendance();
      loadMonthlyStats();
    }
  }, [selectedChild, selectedDate, loadAttendance, loadMonthlyStats]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'absent': return 'bg-red-100 text-red-800';
      case 'late': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle className="h-4 w-4" />;
      case 'absent': return <XCircle className="h-4 w-4" />;
      case 'late': return <Clock className="h-4 w-4" />;
      default: return null;
    }
  };

  const modifiers = {
    present: monthlyAttendance
      .filter(r => r.status === 'present')
      .map(r => new Date(r.date)),
    absent: monthlyAttendance
      .filter(r => r.status === 'absent')
      .map(r => new Date(r.date)),
    late: monthlyAttendance
      .filter(r => r.status === 'late')
      .map(r => new Date(r.date))
  };

  const modifiersStyles = {
    present: { backgroundColor: '#dcfce7', color: '#166534' },
    absent: { backgroundColor: '#fecaca', color: '#dc2626' },
    late: { backgroundColor: '#fef3c7', color: '#d97706' }
  };

  const selectedChildData = children.find(child => child.id === selectedChild);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Parent Portal</h1>
          <p className="text-gray-600">Monitor your child's attendance and progress</p>
        </div>
        
        {children.length > 1 && (
          <Select value={selectedChild} onValueChange={setSelectedChild}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select child" />
            </SelectTrigger>
            <SelectContent>
              {children.map((child) => (
                <SelectItem key={child.id} value={child.id}>
                  {child.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {children.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Children Found</h3>
            <p className="text-gray-500 mb-4">
              You don't have any children linked to your account yet.
            </p>
            <p className="text-sm text-gray-400">
              Contact your school administrator to link your child's account.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Child Info */}
          {selectedChildData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>{selectedChildData.name}'s Attendance</span>
                </CardTitle>
                <CardDescription>
                  Class: {selectedChildData.class_id || 'Not assigned'} • Email: {selectedChildData.email}
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Month</CardTitle>
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Total days</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Present</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.present}</div>
                <p className="text-xs text-muted-foreground">Days present</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Absent</CardTitle>
                <XCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
                <p className="text-xs text-muted-foreground">Days absent</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.percentage}%</div>
                <p className="text-xs text-muted-foreground">Success rate</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Calendar */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CalendarDays className="h-5 w-5" />
                  <span>Attendance Calendar</span>
                </CardTitle>
                <CardDescription>
                  View attendance history for {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  modifiers={modifiers}
                  modifiersStyles={modifiersStyles}
                  className="rounded-md border"
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-green-200 rounded"></div>
                    <span className="text-xs text-gray-600">Present</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-red-200 rounded"></div>
                    <span className="text-xs text-gray-600">Absent</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-yellow-200 rounded"></div>
                    <span className="text-xs text-gray-600">Late</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Selected Date Details */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedDate.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </CardTitle>
                <CardDescription>Attendance details for selected date</CardDescription>
              </CardHeader>
              <CardContent>
                {attendance.length > 0 ? (
                  <div className="space-y-4">
                    {attendance.map((record) => (
                      <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(record.status)}
                          <div>
                            <p className="font-medium">
                              {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                            </p>
                            <p className="text-sm text-gray-500">
                              Marked at {new Date(record.created_at).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        <Badge className={getStatusColor(record.status)}>
                          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        </Badge>
                      </div>
                    ))}
                    {attendance[0]?.notes && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-700">Notes:</p>
                        <p className="text-sm text-gray-600">{attendance[0].notes}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <CalendarDays className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No attendance record for this date</p>
                    <p className="text-sm">Select a different date to view records</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Attendance */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Attendance</CardTitle>
              <CardDescription>Your child's attendance records from the past week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {monthlyAttendance
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 7)
                  .map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(record.status)}
                        <div>
                          <p className="font-medium">
                            {new Date(record.date).toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </p>
                          <p className="text-sm text-gray-500">
                            Marked at {new Date(record.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(record.status)}>
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </Badge>
                    </div>
                  ))}
                
                {monthlyAttendance.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No attendance records found</p>
                    <p className="text-sm">Attendance will appear here once marked by the teacher</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}