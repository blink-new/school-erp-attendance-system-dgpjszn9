import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, Users, BookOpen } from "lucide-react";
import { blink } from "@/blink/client";
import type { User } from "@/types";

interface RoleSelectorProps {
  onUserCreated: (user: User) => void;
}

export function RoleSelector({ onUserCreated }: RoleSelectorProps) {
  const [selectedRole, setSelectedRole] = useState<'student' | 'teacher' | 'parent' | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    classId: '',
    grade: ''
  });
  const [loading, setLoading] = useState(false);

  const roles = [
    {
      id: 'teacher' as const,
      title: 'Teacher',
      description: 'Mark attendance and manage classes',
      icon: GraduationCap,
      color: 'bg-blue-50 border-blue-200 hover:bg-blue-100'
    },
    {
      id: 'student' as const,
      title: 'Student',
      description: 'View your attendance records',
      icon: BookOpen,
      color: 'bg-green-50 border-green-200 hover:bg-green-100'
    },
    {
      id: 'parent' as const,
      title: 'Parent',
      description: 'Monitor your child\'s attendance',
      icon: Users,
      color: 'bg-purple-50 border-purple-200 hover:bg-purple-100'
    }
  ];

  const handleQuickLogin = async (role: 'student' | 'teacher' | 'parent', name: string, email: string) => {
    setLoading(true);
    try {
      // Check if user already exists
      const existingUsers = await blink.db.users.list({
        where: { email: email }
      });

      let userData;
      
      if (existingUsers.length > 0) {
        // User exists, use existing user
        userData = existingUsers[0] as User;
      } else {
        // Create new user with predefined data
        const userId = `${role}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        userData = {
          id: userId,
          email: email,
          name: name,
          role: role,
          class_id: role === 'student' ? 'class_1' : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        await blink.db.users.create(userData);

        // If teacher, create a class
        if (role === 'teacher') {
          const classId = `class_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          await blink.db.classes.create({
            id: classId,
            name: `Grade 1A - ${name}`,
            grade: 'Grade 1',
            teacher_id: userId,
            created_at: new Date().toISOString()
          });
        }

        // If parent, create parent-child relationship
        if (role === 'parent') {
          const students = await blink.db.users.list({
            where: { role: 'student' }
          });
          
          if (students.length > 0) {
            const childId = students[0].id;
            const relationshipId = `pc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            await blink.db.parentChild.create({
              id: relationshipId,
              parent_id: userId,
              child_id: childId,
              created_at: new Date().toISOString()
            });
          }
        }
      }

      // Directly call the callback to set the user
      onUserCreated(userData as User);
    } catch (error) {
      console.error('Error with quick login:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;

    setLoading(true);
    try {
      // Check if user already exists
      const existingUsers = await blink.db.users.list({
        where: { email: formData.email }
      });

      let userData;
      
      if (existingUsers.length > 0) {
        // User exists, use existing user
        userData = existingUsers[0] as User;
      } else {
        // Create new user
        const userId = `${selectedRole}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        userData = {
          id: userId,
          email: formData.email,
          name: formData.name,
          role: selectedRole,
          class_id: selectedRole === 'student' ? formData.classId : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        await blink.db.users.create(userData);

        // If teacher, create a class
        if (selectedRole === 'teacher' && formData.grade) {
          const classId = `class_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          await blink.db.classes.create({
            id: classId,
            name: `${formData.grade} - ${formData.name}`,
            grade: formData.grade,
            teacher_id: userId,
            created_at: new Date().toISOString()
          });
        }

        // If parent, create parent-child relationship if child exists
        if (selectedRole === 'parent') {
          // For demo purposes, we'll link to existing students
          const students = await blink.db.users.list({
            where: { role: 'student' }
          });
          
          if (students.length > 0) {
            // Link to first available student (in real app, this would be more specific)
            const childId = students[0].id;
            const relationshipId = `pc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            await blink.db.parentChild.create({
              id: relationshipId,
              parent_id: userId,
              child_id: childId,
              created_at: new Date().toISOString()
            });
          }
        }
      }

      onUserCreated(userData as User);
    } catch (error) {
      console.error('Error creating user:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!selectedRole) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to School ERP</h1>
            <p className="text-gray-600">Select your role to get started</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {roles.map((role) => {
              const Icon = role.icon;
              return (
                <Card
                  key={role.id}
                  className={`cursor-pointer transition-all duration-200 ${role.color}`}
                  onClick={() => setSelectedRole(role.id)}
                >
                  <CardHeader className="text-center">
                    <div className="mx-auto w-12 h-12 bg-white rounded-full flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-gray-700" />
                    </div>
                    <CardTitle className="text-xl">{role.title}</CardTitle>
                    <CardDescription>{role.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
          
          {/* Quick Login for Testing */}
          <div className="mt-8 p-4 bg-gray-100 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Login (For Testing)</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickLogin('teacher', 'John Smith', 'john.smith@school.edu')}
                disabled={loading}
              >
                Login as Teacher
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickLogin('student', 'Alice Brown', 'alice.brown@student.edu')}
                disabled={loading}
              >
                Login as Student
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickLogin('parent', 'Robert Brown', 'robert.brown@parent.com')}
                disabled={loading}
              >
                Login as Parent
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} Account</CardTitle>
          <CardDescription>Enter your details to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>

            {selectedRole === 'student' && (
              <div>
                <Label htmlFor="classId">Class</Label>
                <Select onValueChange={(value) => setFormData(prev => ({ ...prev, classId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="class_1">Grade 1A</SelectItem>
                    <SelectItem value="class_2">Grade 2B</SelectItem>
                    <SelectItem value="class_3">Grade 3C</SelectItem>
                    <SelectItem value="class_4">Grade 4A</SelectItem>
                    <SelectItem value="class_5">Grade 5B</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedRole === 'teacher' && (
              <div>
                <Label htmlFor="grade">Grade/Class</Label>
                <Select onValueChange={(value) => setFormData(prev => ({ ...prev, grade: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade you teach" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Grade 1">Grade 1</SelectItem>
                    <SelectItem value="Grade 2">Grade 2</SelectItem>
                    <SelectItem value="Grade 3">Grade 3</SelectItem>
                    <SelectItem value="Grade 4">Grade 4</SelectItem>
                    <SelectItem value="Grade 5">Grade 5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedRole(null)}
                className="flex-1"
              >
                Back
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Creating...' : 'Create Account'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}