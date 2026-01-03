// Extracted from Code.txt

Pages/[
    Attendance/
	import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { 
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  TrendingUp,
  CheckCircle,
  XCircle
} from "lucide-react";
import AttendanceTable from "@/components/attendance/AttendanceTable";
import PageHeader from "@/components/common/PageHeader";
import moment from "moment";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function Attendance() {
  const urlParams = new URLSearchParams(window.location.search);
  const employeeParam = urlParams.get("employee");
  
  const [currentUser, setCurrentUser] = useState(null);
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(moment().format("YYYY-MM"));
  const [selectedEmployee, setSelectedEmployee] = useState(employeeParam || "all");
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list("-created_date")
  });

  const { data: attendance = [], isLoading } = useQuery({
    queryKey: ["attendance", selectedMonth, selectedEmployee],
    queryFn: async () => {
      const startDate = moment(selectedMonth).startOf("month").format("YYYY-MM-DD");
      const endDate = moment(selectedMonth).endOf("month").format("YYYY-MM-DD");
      
      let records = await base44.entities.Attendance.list("-date");
      
      records = records.filter(r => {
        const date = moment(r.date);
        return date.isSameOrAfter(startDate) && date.isSameOrBefore(endDate);
      });
      
      if (selectedEmployee !== "all") {
        records = records.filter(r => r.employee_id === selectedEmployee);
      }
      
      // Add employee names
      return records.map(r => {
        const emp = employees.find(e => e.id === r.employee_id);
        return {
          ...r,
          employee_name: emp ? `${emp.first_name} ${emp.last_name}` : "Unknown"
        };
      });
    },
    enabled: employees.length > 0
  });

  useEffect(() => {
    if (currentUser && employees.length > 0) {
      const emp = employees.find(e => e.email === currentUser.email);
      setCurrentEmployee(emp);
      
      // If not admin, only show own attendance
      if (emp && emp.role !== "admin" && emp.role !== "hr_officer") {
        setSelectedEmployee(emp.id);
      }
    }
  }, [currentUser, employees]);

  const isAdmin = currentEmployee?.role === "admin" || currentEmployee?.role === "hr_officer";

  // Calculate stats
  const stats = {
    present: attendance.filter(a => a.status === "present").length,
    absent: attendance.filter(a => a.status === "absent").length,
    halfDay: attendance.filter(a => a.status === "half_day").length,
    leave: attendance.filter(a => a.status === "leave").length,
    totalHours: attendance.reduce((sum, a) => sum + (a.work_hours || 0), 0),
    extraHours: attendance.reduce((sum, a) => sum + (a.extra_hours || 0), 0)
  };

  const navigateMonth = (direction) => {
    const newMonth = moment(selectedMonth).add(direction, "months").format("YYYY-MM");
    setSelectedMonth(newMonth);
  };

  const filteredByDate = selectedDate 
    ? attendance.filter(a => a.date === format(selectedDate, "yyyy-MM-dd"))
    : attendance;

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader 
          title="Attendance"
          description={`${moment(selectedMonth).format("MMMM YYYY")} attendance records`}
        />

        {/* Filters */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              {/* Month Navigation */}
              <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => navigateMonth(-1)}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="px-3 font-medium text-slate-700 min-w-[140px] text-center">
                  {moment(selectedMonth).format("MMMM YYYY")}
                </span>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => navigateMonth(1)}
                  className="h-8 w-8"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Date Picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full sm:w-auto justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Filter by date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
                  {selectedDate && (
                    <div className="p-2 border-t">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full"
                        onClick={() => setSelectedDate(null)}
                      >
                        Clear filter
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>

              {/* Employee Filter (Admin only) */}
              {isAdmin && (
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{stats.present}</p>
                    <p className="text-sm text-slate-500">Days Present</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center">
                    <CalendarIcon className="w-5 h-5 text-sky-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{stats.leave}</p>
                    <p className="text-sm text-slate-500">Leave Days</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{stats.totalHours.toFixed(0)}h</p>
                    <p className="text-sm text-slate-500">Total Hours</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">+{stats.extraHours.toFixed(0)}h</p>
                    <p className="text-sm text-slate-500">Extra Hours</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Attendance Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {isLoading ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </CardContent>
            </Card>
          ) : (
            <AttendanceTable 
              records={filteredByDate}
              showEmployee={isAdmin && selectedEmployee === "all"}
            />
          )}
        </motion.div>
      </div>
    </div>
  );
}

Dashboard/
	import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { 
  Users, 
  Clock, 
  Calendar, 
  TrendingUp,
  Plus,
  Plane,
  UserCheck,
  UserX
} from "lucide-react";
import EmployeeCard from "@/components/common/EmployeeCard";
import EmployeeForm from "@/components/employee/EmployeeForm";
import CheckInButton from "@/components/attendance/CheckInButton";
import PageHeader from "@/components/common/PageHeader";
import moment from "moment";

export default function Dashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list("-created_date")
  });

  const { data: company } = useQuery({
    queryKey: ["company"],
    queryFn: async () => {
      const companies = await base44.entities.Company.list();
      return companies[0];
    }
  });

  const today = moment().format("YYYY-MM-DD");
  
  const { data: todayAttendance = [], refetch: refetchAttendance } = useQuery({
    queryKey: ["todayAttendance", today],
    queryFn: () => base44.entities.Attendance.filter({ date: today })
  });

  const { data: pendingLeaves = [] } = useQuery({
    queryKey: ["pendingLeaves"],
    queryFn: () => base44.entities.LeaveRequest.filter({ status: "pending" })
  });

  const { data: approvedLeaves = [] } = useQuery({
    queryKey: ["approvedLeavesToday"],
    queryFn: async () => {
      const leaves = await base44.entities.LeaveRequest.filter({ 
        status: "approved" 
      });
      return leaves.filter(l => 
        moment(today).isBetween(l.start_date, l.end_date, null, "[]")
      );
    }
  });

  useEffect(() => {
    if (currentUser && employees.length > 0) {
      const emp = employees.find(e => e.email === currentUser.email);
      setCurrentEmployee(emp);
    }
  }, [currentUser, employees]);

  const getAttendanceStatus = (employeeId) => {
    const onLeave = approvedLeaves.find(l => l.employee_id === employeeId);
    if (onLeave) return "leave";
    
    const attendance = todayAttendance.find(a => a.employee_id === employeeId);
    return attendance?.status || "pending";
  };

  const myTodayAttendance = todayAttendance.find(
    a => a.employee_id === currentEmployee?.id
  );

  const isAdmin = currentEmployee?.role === "admin" || currentEmployee?.role === "hr_officer";
  
  const presentCount = todayAttendance.filter(a => a.status === "present" || a.check_in).length;
  const onLeaveCount = approvedLeaves.length;
  const absentCount = employees.length - presentCount - onLeaveCount;

  const stats = [
    { 
      title: "Total Employees", 
      value: employees.length, 
      icon: Users, 
      color: "from-blue-500 to-indigo-600" 
    },
    { 
      title: "Present Today", 
      value: presentCount, 
      icon: UserCheck, 
      color: "from-emerald-500 to-green-600" 
    },
    { 
      title: "On Leave", 
      value: onLeaveCount, 
      icon: Plane, 
      color: "from-sky-500 to-cyan-600" 
    },
    { 
      title: "Pending Requests", 
      value: pendingLeaves.length, 
      icon: Clock, 
      color: "from-amber-500 to-orange-600" 
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <PageHeader 
          title={`Welcome back${currentEmployee ? `, ${currentEmployee.first_name}` : ''}`}
          description={moment().format("dddd, MMMM D, YYYY")}
          actions={
            isAdmin && (
              <Button 
                onClick={() => setShowEmployeeForm(true)}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Employee
              </Button>
            )
          }
        />

        {/* Check-in Widget for current user */}
        {currentEmployee && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-0 shadow-sm bg-gradient-to-br from-white to-slate-50">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      Today's Attendance
                    </h3>
                    <p className="text-slate-500 text-sm mt-1">
                      {moment().format("dddd, MMMM D")}
                    </p>
                  </div>
                  <CheckInButton
                    employeeId={currentEmployee.id}
                    todayAttendance={myTodayAttendance}
                    onUpdate={() => {
                      refetchAttendance();
                      queryClient.invalidateQueries(["todayAttendance"]);
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Stats Grid */}
        {isAdmin && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, idx) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm text-slate-500">{stat.title}</p>
                        <p className="text-3xl font-bold text-slate-900 mt-1">
                          {loadingEmployees ? (
                            <Skeleton className="h-9 w-12" />
                          ) : (
                            stat.value
                          )}
                        </p>
                      </div>
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                        <stat.icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Employee Grid */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            {isAdmin ? "All Employees" : "Team Members"}
          </h2>
          
          {loadingEmployees ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="border-0 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center">
                      <Skeleton className="w-20 h-20 rounded-full mb-4" />
                      <Skeleton className="h-5 w-24 mb-2" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {employees.map((employee, idx) => (
                <motion.div
                  key={employee.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <EmployeeCard 
                    employee={employee}
                    attendanceStatus={getAttendanceStatus(employee.id)}
                  />
                </motion.div>
              ))}
            </div>
          )}
          
          {!loadingEmployees && employees.length === 0 && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">No employees yet</h3>
                <p className="text-slate-500 text-sm mb-4">
                  Get started by adding your first employee
                </p>
                {isAdmin && (
                  <Button onClick={() => setShowEmployeeForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Employee
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <EmployeeForm
        company={company}
        open={showEmployeeForm}
        onOpenChange={setShowEmployeeForm}
        onSuccess={() => {
          queryClient.invalidateQueries(["employees"]);
        }}
      />
    </div>
  );
}
EmployeeDetail/
	import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Calendar,
  MapPin,
  Camera,
  Loader2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import ProfileTabs from "@/components/profile/ProfileTabs";
import moment from "moment";

export default function EmployeeDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const employeeId = urlParams.get("id");
  
  const [currentUser, setCurrentUser] = useState(null);
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list()
  });

  const { data: employee, isLoading, refetch } = useQuery({
    queryKey: ["employee", employeeId],
    queryFn: async () => {
      const emps = await base44.entities.Employee.filter({ id: employeeId });
      return emps[0];
    },
    enabled: !!employeeId
  });

  const { data: salary, refetch: refetchSalary } = useQuery({
    queryKey: ["salary", employeeId],
    queryFn: async () => {
      const salaries = await base44.entities.Salary.filter({ employee_id: employeeId });
      return salaries[0];
    },
    enabled: !!employeeId
  });

  useEffect(() => {
    if (currentUser && employees.length > 0) {
      const emp = employees.find(e => e.email === currentUser.email);
      setCurrentEmployee(emp);
    }
  }, [currentUser, employees]);

  const isAdmin = currentEmployee?.role === "admin" || currentEmployee?.role === "hr_officer";
  const isOwnProfile = currentEmployee?.id === employeeId;

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.Employee.update(employeeId, { profile_picture: file_url });
      refetch();
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const roleColors = {
    admin: "bg-purple-100 text-purple-700",
    hr_officer: "bg-blue-100 text-blue-700",
    employee: "bg-slate-100 text-slate-700"
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-32" />
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8">
              <div className="flex items-start gap-6">
                <Skeleton className="w-32 h-32 rounded-2xl" />
                <div className="space-y-3 flex-1">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <p className="text-slate-500">Employee not found</p>
              <Link to={createPageUrl("Employees")}>
                <Button variant="outline" className="mt-4">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Employees
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Button */}
        <Link to={createPageUrl("Employees")}>
          <Button variant="ghost" className="text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>

        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-0 shadow-sm overflow-hidden">
            <div className="h-32 bg-gradient-to-r from-blue-500 to-indigo-600" />
            <CardContent className="p-6 -mt-16 relative">
              <div className="flex flex-col sm:flex-row items-start gap-6">
                <div className="relative">
                  <Avatar className="w-32 h-32 ring-4 ring-white shadow-lg">
                    <AvatarImage src={employee.profile_picture} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-4xl">
                      {employee.first_name?.[0]}{employee.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  {(isAdmin || isOwnProfile) && (
                    <label
                      htmlFor="profile-upload"
                      className="absolute bottom-0 right-0 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors ring-2 ring-white"
                    >
                      {uploadingPhoto ? (
                        <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
                      ) : (
                        <Camera className="w-5 h-5 text-slate-500" />
                      )}
                    </label>
                  )}
                  <Input
                    id="profile-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>
                
                <div className="flex-1 pt-4 sm:pt-16">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl font-bold text-slate-900">
                          {employee.first_name} {employee.last_name}
                        </h1>
                        <Badge 
                          variant="secondary" 
                          className={`capitalize ${roleColors[employee.role]}`}
                        >
                          {employee.role?.replace("_", " ")}
                        </Badge>
                      </div>
                      
                      {employee.designation && (
                        <p className="text-lg text-slate-600 mt-1">
                          {employee.designation}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {employee.email}
                    </span>
                    {employee.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        {employee.phone}
                      </span>
                    )}
                    {employee.department && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-4 h-4" />
                        {employee.department}
                      </span>
                    )}
                    {employee.date_of_joining && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Joined {moment(employee.date_of_joining).format("MMM D, YYYY")}
                      </span>
                    )}
                  </div>
                  
                  {employee.login_id && (
                    <div className="mt-4 p-3 bg-slate-50 rounded-lg inline-block">
                      <p className="text-xs text-slate-400">Login ID</p>
                      <p className="font-mono text-sm text-slate-700 font-medium">
                        {employee.login_id}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Profile Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <ProfileTabs
            employee={employee}
            salary={salary}
            isAdmin={isAdmin}
            isOwnProfile={isOwnProfile}
            onUpdate={() => {
              refetch();
              refetchSalary();
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}
Employees/
	import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Plus, 
  Search, 
  Filter,
  Mail,
  Phone,
  Building2,
  MoreVertical
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import EmployeeForm from "@/components/employee/EmployeeForm";
import PageHeader from "@/components/common/PageHeader";
import moment from "moment";

export default function Employees() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list("-created_date")
  });

  const { data: company } = useQuery({
    queryKey: ["company"],
    queryFn: async () => {
      const companies = await base44.entities.Company.list();
      return companies[0];
    }
  });

  useEffect(() => {
    if (currentUser && employees.length > 0) {
      const emp = employees.find(e => e.email === currentUser.email);
      setCurrentEmployee(emp);
    }
  }, [currentUser, employees]);

  const isAdmin = currentEmployee?.role === "admin" || currentEmployee?.role === "hr_officer";

  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))];

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = searchQuery === "" || 
      `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.login_id?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === "all" || emp.role === roleFilter;
    const matchesDept = departmentFilter === "all" || emp.department === departmentFilter;
    
    return matchesSearch && matchesRole && matchesDept;
  });

  const roleColors = {
    admin: "bg-purple-100 text-purple-700",
    hr_officer: "bg-blue-100 text-blue-700",
    employee: "bg-slate-100 text-slate-700"
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader 
          title="Employees"
          description={`${employees.length} team members`}
          actions={
            isAdmin && (
              <Button 
                onClick={() => setShowEmployeeForm(true)}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Employee
              </Button>
            )
          }
        />

        {/* Filters */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by name, email, or login ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="hr_officer">HR Officer</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                </SelectContent>
              </Select>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Employee List */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-14 h-14 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEmployees.map((employee, idx) => (
              <motion.div
                key={employee.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
              >
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Link to={createPageUrl(`EmployeeDetail?id=${employee.id}`)}>
                        <Avatar className="w-14 h-14 ring-2 ring-slate-100">
                          <AvatarImage src={employee.profile_picture} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-lg">
                            {employee.first_name?.[0]}{employee.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link 
                            to={createPageUrl(`EmployeeDetail?id=${employee.id}`)}
                            className="font-semibold text-slate-900 hover:text-blue-600 transition-colors"
                          >
                            {employee.first_name} {employee.last_name}
                          </Link>
                          <Badge 
                            variant="secondary" 
                            className={`capitalize ${roleColors[employee.role]}`}
                          >
                            {employee.role?.replace("_", " ")}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                          {employee.designation && (
                            <span>{employee.designation}</span>
                          )}
                          {employee.department && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {employee.department}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {employee.email}
                          </span>
                          {employee.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {employee.phone}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-slate-400">Login ID</p>
                        <p className="font-mono text-sm text-slate-600">
                          {employee.login_id || "—"}
                        </p>
                        <p className="text-xs text-slate-400 mt-2">
                          Joined {moment(employee.date_of_joining).format("MMM YYYY")}
                        </p>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <Link to={createPageUrl(`EmployeeDetail?id=${employee.id}`)}>
                            <DropdownMenuItem>View Profile</DropdownMenuItem>
                          </Link>
                          {isAdmin && (
                            <>
                              <Link to={createPageUrl(`Attendance?employee=${employee.id}`)}>
                                <DropdownMenuItem>View Attendance</DropdownMenuItem>
                              </Link>
                              <Link to={createPageUrl(`TimeOff?employee=${employee.id}`)}>
                                <DropdownMenuItem>View Leaves</DropdownMenuItem>
                              </Link>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            
            {filteredEmployees.length === 0 && (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center">
                  <p className="text-slate-500">No employees found matching your filters</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      <EmployeeForm
        company={company}
        open={showEmployeeForm}
        onOpenChange={setShowEmployeeForm}
        onSuccess={() => {
          queryClient.invalidateQueries(["employees"]);
        }}
      />
    </div>
  );
}
MyProfile/
	import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { 
  Mail,
  Phone,
  Building2,
  Calendar,
  Camera,
  Loader2,
  Shield
} from "lucide-react";
import ProfileTabs from "@/components/profile/ProfileTabs";
import moment from "moment";

export default function MyProfile() {
  const [currentUser, setCurrentUser] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list()
  });

  const currentEmployee = employees.find(e => e.email === currentUser?.email);

  const { data: salary, refetch: refetchSalary } = useQuery({
    queryKey: ["mySalary", currentEmployee?.id],
    queryFn: async () => {
      if (!currentEmployee) return null;
      const salaries = await base44.entities.Salary.filter({ employee_id: currentEmployee.id });
      return salaries[0];
    },
    enabled: !!currentEmployee
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentEmployee) return;
    
    setUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.Employee.update(currentEmployee.id, { profile_picture: file_url });
      queryClient.invalidateQueries(["employees"]);
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const roleColors = {
    admin: "bg-purple-100 text-purple-700",
    hr_officer: "bg-blue-100 text-blue-700",
    employee: "bg-slate-100 text-slate-700"
  };

  if (!currentEmployee) {
    return (
      <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8">
              <div className="flex items-start gap-6">
                <Skeleton className="w-32 h-32 rounded-2xl" />
                <div className="space-y-3 flex-1">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-0 shadow-sm overflow-hidden">
            <div className="h-32 bg-gradient-to-r from-blue-500 to-indigo-600" />
            <CardContent className="p-6 -mt-16 relative">
              <div className="flex flex-col sm:flex-row items-start gap-6">
                <div className="relative">
                  <Avatar className="w-32 h-32 ring-4 ring-white shadow-lg">
                    <AvatarImage src={currentEmployee.profile_picture} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-4xl">
                      {currentEmployee.first_name?.[0]}{currentEmployee.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <label
                    htmlFor="profile-upload"
                    className="absolute bottom-0 right-0 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors ring-2 ring-white"
                  >
                    {uploadingPhoto ? (
                      <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
                    ) : (
                      <Camera className="w-5 h-5 text-slate-500" />
                    )}
                  </label>
                  <Input
                    id="profile-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>
                
                <div className="flex-1 pt-4 sm:pt-16">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl font-bold text-slate-900">
                          {currentEmployee.first_name} {currentEmployee.last_name}
                        </h1>
                        <Badge 
                          variant="secondary" 
                          className={`capitalize ${roleColors[currentEmployee.role]}`}
                        >
                          {currentEmployee.role?.replace("_", " ")}
                        </Badge>
                      </div>
                      
                      {currentEmployee.designation && (
                        <p className="text-lg text-slate-600 mt-1">
                          {currentEmployee.designation}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {currentEmployee.email}
                    </span>
                    {currentEmployee.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        {currentEmployee.phone}
                      </span>
                    )}
                    {currentEmployee.department && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-4 h-4" />
                        {currentEmployee.department}
                      </span>
                    )}
                    {currentEmployee.date_of_joining && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Joined {moment(currentEmployee.date_of_joining).format("MMM D, YYYY")}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex gap-4 mt-4">
                    {currentEmployee.login_id && (
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-400">Login ID</p>
                        <p className="font-mono text-sm text-slate-700 font-medium">
                          {currentEmployee.login_id}
                        </p>
                      </div>
                    )}
                    {currentEmployee.employee_code && currentEmployee.employee_code !== currentEmployee.login_id && (
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-400">Employee Code</p>
                        <p className="font-mono text-sm text-slate-700 font-medium">
                          {currentEmployee.employee_code}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Profile Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <ProfileTabs
            employee={currentEmployee}
            salary={salary}
            isAdmin={false}
            isOwnProfile={true}
            onUpdate={() => {
              queryClient.invalidateQueries(["employees"]);
              refetchSalary();
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}
Setup/
	import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Building2,
  Upload,
  Loader2,
  CheckCircle,
  AlertCircle,
  User
} from "lucide-react";
import moment from "moment";

export default function Setup() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  
  const [companyData, setCompanyData] = useState({
    name: "",
    code: "",
    logo_url: ""
  });
  
  const [adminData, setAdminData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    confirm_password: ""
  });

  const { data: companies = [], isLoading: checkingCompany } = useQuery({
    queryKey: ["companies"],
    queryFn: () => base44.entities.Company.list()
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list()
  });

  const existingCompany = companies[0];
  const adminCount = employees.filter(e => e.role === "admin" || e.role === "hr_officer").length;

  useEffect(() => {
    if (existingCompany && adminCount >= 2) {
      window.location.href = createPageUrl("Dashboard");
    }
  }, [existingCompany, adminCount]);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingLogo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setCompanyData(prev => ({ ...prev, logo_url: file_url }));
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploadingLogo(false);
    }
  };

  const generateLoginId = () => {
    const year = moment().format("YYYY");
    const companyCode = companyData.code.toUpperCase() || "DF";
    const firstInitial = adminData.first_name?.[0]?.toUpperCase() || "A";
    const lastInitial = adminData.last_name?.[0]?.toUpperCase() || "A";
    return `${companyCode}${firstInitial}${lastInitial}${year}0001`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    if (step === 1) {
      if (!companyData.name || !companyData.code) {
        setError("Please fill in all required fields");
        return;
      }
      if (companyData.code.length < 2 || companyData.code.length > 4) {
        setError("Company code must be 2-4 characters");
        return;
      }
      setStep(2);
      return;
    }
    
    // Step 2 validation
    if (adminData.password !== adminData.confirm_password) {
      setError("Passwords do not match");
      return;
    }
    
    if (adminData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Create company if not exists
      let company = existingCompany;
      if (!company) {
        company = await base44.entities.Company.create({
          name: companyData.name,
          code: companyData.code.toUpperCase(),
          logo_url: companyData.logo_url,
          admin_count: 1
        });
      } else {
        await base44.entities.Company.update(company.id, {
          admin_count: (company.admin_count || 0) + 1
        });
      }
      
      // Create admin employee
      const loginId = generateLoginId();
      
      await base44.entities.Employee.create({
        login_id: loginId,
        employee_code: loginId,
        first_name: adminData.first_name,
        last_name: adminData.last_name,
        email: adminData.email,
        phone: adminData.phone,
        role: "admin",
        status: "active",
        company_code: companyData.code.toUpperCase(),
        date_of_joining: moment().format("YYYY-MM-DD")
      });
      
      // Initialize leave balance
      await base44.entities.LeaveBalance.create({
        employee_id: loginId,
        year: moment().year(),
        paid_leave_total: 12,
        paid_leave_used: 0,
        sick_leave_total: 6,
        sick_leave_used: 0,
        unpaid_leave_used: 0
      });
      
      // Redirect to dashboard
      window.location.href = createPageUrl("Dashboard");
    } catch (error) {
      console.error("Setup error:", error);
      setError("Failed to complete setup. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingCompany) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Dayflow HRMS</h1>
          <p className="text-slate-600 mt-2">
            {existingCompany 
              ? "Add another admin account" 
              : "Set up your company account"}
          </p>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-4 mb-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600' : 'bg-slate-200'}`}>
                {step > 1 ? (
                  <CheckCircle className="w-5 h-5 text-white" />
                ) : (
                  <Building2 className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="flex-1 h-1 bg-slate-200 rounded-full">
                <div 
                  className="h-full bg-blue-600 rounded-full transition-all"
                  style={{ width: step === 1 ? '0%' : '100%' }}
                />
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600' : 'bg-slate-200'}`}>
                <User className={`w-5 h-5 ${step >= 2 ? 'text-white' : 'text-slate-400'}`} />
              </div>
            </div>
            <CardTitle>
              {step === 1 ? "Company Details" : "Admin Account"}
            </CardTitle>
            <CardDescription>
              {step === 1 
                ? "Enter your company information"
                : "Create your admin account"}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {step === 1 ? (
                <>
                  <div className="space-y-2">
                    <Label>Company Name *</Label>
                    <Input
                      value={companyData.name}
                      onChange={(e) => setCompanyData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Odion India Pvt Ltd"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Company Code * (2-4 characters)</Label>
                    <Input
                      value={companyData.code}
                      onChange={(e) => setCompanyData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      placeholder="OI"
                      maxLength={4}
                      required
                    />
                    <p className="text-xs text-slate-500">
                      Used for generating employee login IDs (e.g., OI for Odion India)
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Company Logo (Optional)</Label>
                    {companyData.logo_url ? (
                      <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                        <img 
                          src={companyData.logo_url} 
                          alt="Logo" 
                          className="w-16 h-16 object-contain rounded"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCompanyData(prev => ({ ...prev, logo_url: "" }))}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <Label
                        htmlFor="logo-upload"
                        className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        {uploadingLogo ? (
                          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                        ) : (
                          <>
                            <Upload className="w-6 h-6 text-slate-400" />
                            <span className="text-sm text-slate-500">Upload logo</span>
                          </>
                        )}
                      </Label>
                    )}
                    <Input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Name *</Label>
                      <Input
                        value={adminData.first_name}
                        onChange={(e) => setAdminData(prev => ({ ...prev, first_name: e.target.value }))}
                        placeholder="John"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name *</Label>
                      <Input
                        value={adminData.last_name}
                        onChange={(e) => setAdminData(prev => ({ ...prev, last_name: e.target.value }))}
                        placeholder="Doe"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={adminData.email}
                      onChange={(e) => setAdminData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="admin@company.com"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={adminData.phone}
                      onChange={(e) => setAdminData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+91 9876543210"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Password *</Label>
                    <Input
                      type="password"
                      value={adminData.password}
                      onChange={(e) => setAdminData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Confirm Password *</Label>
                    <Input
                      type="password"
                      value={adminData.confirm_password}
                      onChange={(e) => setAdminData(prev => ({ ...prev, confirm_password: e.target.value }))}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  
                  {adminData.first_name && adminData.last_name && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-600 font-medium">Your Login ID will be:</p>
                      <p className="font-mono text-blue-800">{generateLoginId()}</p>
                    </div>
                  )}
                </>
              )}
              
              <div className="flex gap-3 pt-4">
                {step === 2 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1"
                  >
                    Back
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {step === 1 ? "Continue" : "Complete Setup"}
                </Button>
              </div>
            </form>
            
            {adminCount > 0 && adminCount < 2 && (
              <p className="text-xs text-center text-slate-500 mt-4">
                {2 - adminCount} admin account(s) remaining
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
TimeOff/
	import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { 
  Plus,
  Calendar,
  Plane,
  Stethoscope,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react";
import LeaveRequestForm from "@/components/leave/LeaveRequestForm";
import LeaveRequestCard from "@/components/leave/LeaveRequestCard";
import PageHeader from "@/components/common/PageHeader";
import moment from "moment";

export default function TimeOff() {
  const urlParams = new URLSearchParams(window.location.search);
  const employeeParam = urlParams.get("employee");
  
  const [currentUser, setCurrentUser] = useState(null);
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(employeeParam || "all");
  const [activeTab, setActiveTab] = useState("all");
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list("-created_date")
  });

  const { data: leaveRequests = [], isLoading, refetch } = useQuery({
    queryKey: ["leaveRequests"],
    queryFn: () => base44.entities.LeaveRequest.list("-created_date")
  });

  const { data: leaveBalances = [] } = useQuery({
    queryKey: ["leaveBalances"],
    queryFn: () => base44.entities.LeaveBalance.list()
  });

  useEffect(() => {
    if (currentUser && employees.length > 0) {
      const emp = employees.find(e => e.email === currentUser.email);
      setCurrentEmployee(emp);
      
      if (emp && emp.role !== "admin" && emp.role !== "hr_officer") {
        setSelectedEmployee(emp.id);
      }
    }
  }, [currentUser, employees]);

  const isAdmin = currentEmployee?.role === "admin" || currentEmployee?.role === "hr_officer";

  const handleApprove = async (requestId, remarks) => {
    const request = leaveRequests.find(r => r.id === requestId);
    
    await base44.entities.LeaveRequest.update(requestId, {
      status: "approved",
      admin_remarks: remarks,
      reviewed_by: currentUser?.email,
      reviewed_at: new Date().toISOString()
    });
    
    // Create attendance records for leave days
    if (request) {
      const startDate = moment(request.start_date);
      const endDate = moment(request.end_date);
      
      for (let date = startDate.clone(); date.isSameOrBefore(endDate); date.add(1, "day")) {
        await base44.entities.Attendance.create({
          employee_id: request.employee_id,
          date: date.format("YYYY-MM-DD"),
          status: "leave",
          notes: `${request.leave_type.replace("_", " ")} - Approved`
        });
      }
      
      // Update leave balance
      const year = moment().year();
      let balance = leaveBalances.find(b => b.employee_id === request.employee_id && b.year === year);
      
      if (balance) {
        const updateData = {};
        if (request.leave_type === "paid_leave") {
          updateData.paid_leave_used = (balance.paid_leave_used || 0) + request.total_days;
        } else if (request.leave_type === "sick_leave") {
          updateData.sick_leave_used = (balance.sick_leave_used || 0) + request.total_days;
        } else {
          updateData.unpaid_leave_used = (balance.unpaid_leave_used || 0) + request.total_days;
        }
        await base44.entities.LeaveBalance.update(balance.id, updateData);
      }
    }
    
    refetch();
    queryClient.invalidateQueries(["leaveBalances"]);
  };

  const handleReject = async (requestId, remarks) => {
    await base44.entities.LeaveRequest.update(requestId, {
      status: "rejected",
      admin_remarks: remarks,
      reviewed_by: currentUser?.email,
      reviewed_at: new Date().toISOString()
    });
    refetch();
  };

  // Filter leave requests
  let filteredRequests = leaveRequests;
  
  if (selectedEmployee !== "all") {
    filteredRequests = filteredRequests.filter(r => r.employee_id === selectedEmployee);
  }
  
  if (activeTab !== "all") {
    filteredRequests = filteredRequests.filter(r => r.status === activeTab);
  }

  // Get employee info for requests
  const requestsWithEmployee = filteredRequests.map(request => ({
    request,
    employee: employees.find(e => e.id === request.employee_id)
  }));

  // Get current user's leave balance
  const myBalance = leaveBalances.find(
    b => b.employee_id === currentEmployee?.id && b.year === moment().year()
  );

  const balanceCards = [
    {
      type: "Paid Leave",
      icon: Plane,
      used: myBalance?.paid_leave_used || 0,
      total: myBalance?.paid_leave_total || 12,
      color: "from-blue-500 to-indigo-600"
    },
    {
      type: "Sick Leave",
      icon: Stethoscope,
      used: myBalance?.sick_leave_used || 0,
      total: myBalance?.sick_leave_total || 6,
      color: "from-emerald-500 to-green-600"
    },
    {
      type: "Unpaid Leave",
      icon: Calendar,
      used: myBalance?.unpaid_leave_used || 0,
      total: "∞",
      color: "from-amber-500 to-orange-600"
    }
  ];

  const statusCounts = {
    pending: leaveRequests.filter(r => 
      (selectedEmployee === "all" || r.employee_id === selectedEmployee) && 
      r.status === "pending"
    ).length,
    approved: leaveRequests.filter(r => 
      (selectedEmployee === "all" || r.employee_id === selectedEmployee) && 
      r.status === "approved"
    ).length,
    rejected: leaveRequests.filter(r => 
      (selectedEmployee === "all" || r.employee_id === selectedEmployee) && 
      r.status === "rejected"
    ).length
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader 
          title="Time Off"
          description="Manage leave requests and balances"
          actions={
            <Button 
              onClick={() => setShowLeaveForm(true)}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Apply for Leave
            </Button>
          }
        />

        {/* Leave Balance Cards (for current employee) */}
        {(!isAdmin || selectedEmployee !== "all") && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {balanceCards.map((card, idx) => (
              <motion.div
                key={card.type}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="border-0 shadow-sm overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500">{card.type}</p>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-3xl font-bold text-slate-900">
                            {typeof card.total === "number" ? card.total - card.used : card.used}
                          </span>
                          {typeof card.total === "number" && (
                            <span className="text-slate-400">/ {card.total}</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {card.used} days used
                        </p>
                      </div>
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                        <card.icon className="w-7 h-7 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Filters */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-slate-100">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="pending" className="relative">
                    Pending
                    {statusCounts.pending > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs bg-amber-500 text-white rounded-full">
                        {statusCounts.pending}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="approved">Approved</TabsTrigger>
                  <TabsTrigger value="rejected">Rejected</TabsTrigger>
                </TabsList>
              </Tabs>
              
              {isAdmin && (
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Leave Requests List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {isLoading ? (
            [...Array(3)].map((_, i) => (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-64" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : requestsWithEmployee.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">No leave requests</h3>
                <p className="text-slate-500 text-sm">
                  {activeTab === "all" 
                    ? "No leave requests found" 
                    : `No ${activeTab} requests`}
                </p>
              </CardContent>
            </Card>
          ) : (
            requestsWithEmployee.map(({ request, employee }, idx) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <LeaveRequestCard
                  request={request}
                  employee={isAdmin ? employee : null}
                  isAdmin={isAdmin}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              </motion.div>
            ))
          )}
        </motion.div>
      </div>

      <LeaveRequestForm
        employeeId={currentEmployee?.id}
        open={showLeaveForm}
        onOpenChange={setShowLeaveForm}
        onSuccess={refetch}
      />
    </div>
  );
}
]
Components/[
	UserNotRegisteredError/
	import React from 'react';

const UserNotRegisteredError = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white to-slate-50">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg border border-slate-100">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-orange-100">
            <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Access Restricted</h1>
          <p className="text-slate-600 mb-8">
            You are not registered to use this application. Please contact the app administrator to request access.
          </p>
          <div className="p-4 bg-slate-50 rounded-md text-sm text-slate-600">
            <p>If you believe this is an error, you can:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Verify you are logged in with the correct account</li>
              <li>Contact the app administrator for access</li>
              <li>Try logging out and back in again</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserNotRegisteredError;


attendance/ [
	AttendanceTable/
	import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import moment from "moment";
import { cn } from "@/lib/utils";

export default function AttendanceTable({ records, showEmployee = false }) {
  const statusColors = {
    present: "bg-emerald-100 text-emerald-700",
    absent: "bg-amber-100 text-amber-700",
    half_day: "bg-orange-100 text-orange-700",
    leave: "bg-sky-100 text-sky-700",
    pending: "bg-slate-100 text-slate-700"
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            {showEmployee && (
              <TableHead className="font-semibold">Employee</TableHead>
            )}
            <TableHead className="font-semibold">Date</TableHead>
            <TableHead className="font-semibold">Check In</TableHead>
            <TableHead className="font-semibold">Check Out</TableHead>
            <TableHead className="font-semibold">Work Hours</TableHead>
            <TableHead className="font-semibold">Extra Hours</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.length === 0 ? (
            <TableRow>
              <TableCell 
                colSpan={showEmployee ? 7 : 6} 
                className="text-center py-8 text-slate-500"
              >
                No attendance records found
              </TableCell>
            </TableRow>
          ) : (
            records.map((record) => (
              <TableRow key={record.id} className="hover:bg-slate-50/50">
                {showEmployee && (
                  <TableCell className="font-medium">
                    {record.employee_name || record.employee_id}
                  </TableCell>
                )}
                <TableCell>
                  {moment(record.date).format("MMM D, YYYY")}
                </TableCell>
                <TableCell>
                  {record.check_in 
                    ? moment(record.check_in).format("h:mm A")
                    : "—"
                  }
                </TableCell>
                <TableCell>
                  {record.check_out 
                    ? moment(record.check_out).format("h:mm A")
                    : "—"
                  }
                </TableCell>
                <TableCell>
                  {record.work_hours 
                    ? `${record.work_hours.toFixed(1)}h`
                    : "—"
                  }
                </TableCell>
                <TableCell>
                  {record.extra_hours 
                    ? <span className="text-emerald-600">+{record.extra_hours.toFixed(1)}h</span>
                    : "—"
                  }
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="secondary"
                    className={cn("capitalize", statusColors[record.status])}
                  >
                    {record.status?.replace("_", " ")}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
CheckInButton/
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Clock, LogIn, LogOut, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import moment from "moment";

export default function CheckInButton({ 
  employeeId, 
  todayAttendance, 
  onUpdate 
}) {
  const [isLoading, setIsLoading] = useState(false);

  const isCheckedIn = todayAttendance?.check_in && !todayAttendance?.check_out;
  const isCheckedOut = todayAttendance?.check_in && todayAttendance?.check_out;

  const handleCheckIn = async () => {
    setIsLoading(true);
    try {
      const now = new Date().toISOString();
      const today = moment().format("YYYY-MM-DD");
      
      await base44.entities.Attendance.create({
        employee_id: employeeId,
        date: today,
        check_in: now,
        status: "present"
      });
      
      onUpdate?.();
    } catch (error) {
      console.error("Check-in error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setIsLoading(true);
    try {
      const now = new Date().toISOString();
      const checkInTime = moment(todayAttendance.check_in);
      const checkOutTime = moment(now);
      
      const duration = moment.duration(checkOutTime.diff(checkInTime));
      const workHours = duration.asHours();
      const extraHours = Math.max(0, workHours - 8);
      
      await base44.entities.Attendance.update(todayAttendance.id, {
        check_out: now,
        work_hours: parseFloat(workHours.toFixed(2)),
        extra_hours: parseFloat(extraHours.toFixed(2)),
        status: workHours >= 4 ? (workHours >= 8 ? "present" : "half_day") : "absent"
      });
      
      onUpdate?.();
    } catch (error) {
      console.error("Check-out error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <AnimatePresence mode="wait">
        {isCheckedOut ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-2">
              <Clock className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-slate-700">Work Complete</p>
            <p className="text-xs text-slate-500">
              {todayAttendance?.work_hours?.toFixed(1)}h worked
            </p>
          </motion.div>
        ) : isCheckedIn ? (
          <motion.div
            key="checkout"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <Button
              size="lg"
              onClick={handleCheckOut}
              disabled={isLoading}
              className="bg-rose-500 hover:bg-rose-600 text-white h-14 px-8 rounded-xl shadow-lg shadow-rose-200"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <LogOut className="w-5 h-5 mr-2" />
              )}
              Check Out
            </Button>
            <p className="text-xs text-slate-500 mt-2">
              Checked in at {moment(todayAttendance.check_in).format("h:mm A")}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="checkin"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <Button
              size="lg"
              onClick={handleCheckIn}
              disabled={isLoading}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white h-14 px-8 rounded-xl shadow-lg shadow-blue-200"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <LogIn className="w-5 h-5 mr-2" />
              )}
              Check In
            </Button>
            <p className="text-xs text-slate-500 mt-2">
              {moment().format("dddd, MMMM D")}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
]
common/[
	EmployeeCard/
		import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import StatusBadge from "./StatusBadge";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function EmployeeCard({ employee, attendanceStatus = "pending" }) {
  const initials = `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase();
  
  return (
    <Link to={createPageUrl(`EmployeeDetail?id=${employee.id}`)}>
      <motion.div
        whileHover={{ y: -4, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="cursor-pointer bg-white hover:shadow-lg transition-shadow duration-300 border-0 shadow-sm overflow-hidden group">
          <CardContent className="p-6 relative">
            {/* Status indicator */}
            <div className="absolute top-4 right-4">
              <StatusBadge status={attendanceStatus} size="dot" />
            </div>
            
            {/* Profile section */}
            <div className="flex flex-col items-center text-center">
              <Avatar className="w-20 h-20 mb-4 ring-4 ring-slate-100 group-hover:ring-blue-100 transition-all">
                <AvatarImage src={employee.profile_picture} alt={employee.first_name} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xl font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              
              <h3 className="font-semibold text-slate-900 text-lg">
                {employee.first_name} {employee.last_name}
              </h3>
              
              <p className="text-sm text-slate-500 mt-1">
                {employee.designation || employee.role}
              </p>
              
              {employee.department && (
                <span className="text-xs text-slate-400 mt-2 px-3 py-1 bg-slate-50 rounded-full">
                  {employee.department}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
}
   PageHeader/
import { motion } from "framer-motion";

export default function PageHeader({ title, description, actions }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
    >
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-slate-500 mt-1">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </motion.div>
  );
}
StatusBadge/
	import { Badge } from "@/components/ui/badge";
import { Plane, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StatusBadge({ status, size = "default" }) {
  const statusConfig = {
    present: {
      color: "bg-emerald-500",
      label: "Present",
      icon: null
    },
    absent: {
      color: "bg-amber-500",
      label: "Absent",
      icon: null
    },
    leave: {
      color: "bg-sky-500",
      label: "On Leave",
      icon: Plane
    },
    half_day: {
      color: "bg-orange-500",
      label: "Half Day",
      icon: null
    },
    pending: {
      color: "bg-slate-400",
      label: "Not Checked In",
      icon: null
    }
  };

  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  if (size === "dot") {
    return (
      <div className="relative">
        {Icon ? (
          <Icon className="w-4 h-4 text-sky-500" />
        ) : (
          <div className={cn("w-3 h-3 rounded-full", config.color)} />
        )}
      </div>
    );
  }

  return (
    <Badge 
      variant="secondary" 
      className={cn(
        "text-white border-0",
        config.color
      )}
    >
      {Icon && <Icon className="w-3 h-3 mr-1" />}
      {config.label}
    </Badge>
  );
}

]
employee/
EmployeeForm/
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { base44 } from "@/api/base44Client";
import { Loader2, Upload, Camera, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import moment from "moment";

export default function EmployeeForm({ 
  company,
  open, 
  onOpenChange, 
  onSuccess 
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    role: "employee",
    department: "",
    designation: "",
    date_of_joining: new Date().toISOString().split("T")[0],
    profile_picture: ""
  });

  const generateLoginId = async () => {
    const year = moment(formData.date_of_joining).format("YYYY");
    const companyCode = company?.code || "DF";
    const firstInitial = formData.first_name?.[0]?.toUpperCase() || "X";
    const lastInitial = formData.last_name?.[0]?.toUpperCase() || "X";
    
    // Get count of employees for this year
    const employees = await base44.entities.Employee.filter({ 
      date_of_joining: { $regex: year }
    });
    const serialNumber = String(employees.length + 1).padStart(4, "0");
    
    return `${companyCode}${firstInitial}${lastInitial}${year}${serialNumber}`;
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, profile_picture: file_url }));
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    
    try {
      // Check admin limit
      if (formData.role === "admin" || formData.role === "hr_officer") {
        const admins = await base44.entities.Employee.filter({ 
          role: { $in: ["admin", "hr_officer"] }
        });
        if (admins.length >= 2) {
          setError("Maximum 2 admin/HR accounts allowed in the system");
          setIsLoading(false);
          return;
        }
      }
      
      const loginId = await generateLoginId();
      
      await base44.entities.Employee.create({
        ...formData,
        login_id: loginId,
        employee_code: loginId,
        company_code: company?.code,
        status: "active"
      });
      
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        role: "employee",
        department: "",
        designation: "",
        date_of_joining: new Date().toISOString().split("T")[0],
        profile_picture: ""
      });
      
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Submit error:", error);
      setError("Failed to create employee");
    } finally {
      setIsLoading(false);
    }
  };

  const initials = `${formData.first_name?.[0] || ''}${formData.last_name?.[0] || ''}`.toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Employee</DialogTitle>
          <DialogDescription>
            Create a new employee account. A login ID will be auto-generated.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {/* Profile Photo */}
          <div className="flex justify-center">
            <div className="relative">
              <Avatar className="w-24 h-24 ring-4 ring-slate-100">
                <AvatarImage src={formData.profile_picture} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-2xl">
                  {initials || "?"}
                </AvatarFallback>
              </Avatar>
              <Label
                htmlFor="photo-upload"
                className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors"
              >
                {uploadingPhoto ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                ) : (
                  <Camera className="w-4 h-4 text-slate-500" />
                )}
              </Label>
              <Input
                id="photo-upload"
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>
          </div>
          
          {/* Name fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>First Name *</Label>
              <Input
                value={formData.first_name}
                onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                placeholder="John"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Last Name *</Label>
              <Input
                value={formData.last_name}
                onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                placeholder="Doe"
                required
              />
            </div>
          </div>
          
          {/* Contact */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="john@company.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+91 9876543210"
              />
            </div>
          </div>
          
          {/* Role */}
          <div className="space-y-2">
            <Label>Role *</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="hr_officer">HR Officer</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              Note: Only 2 Admin/HR accounts are allowed in the system
            </p>
          </div>
          
          {/* Department & Designation */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Department</Label>
              <Input
                value={formData.department}
                onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                placeholder="Engineering"
              />
            </div>
            <div className="space-y-2">
              <Label>Designation</Label>
              <Input
                value={formData.designation}
                onChange={(e) => setFormData(prev => ({ ...prev, designation: e.target.value }))}
                placeholder="Software Engineer"
              />
            </div>
          </div>
          
          {/* Date of Joining */}
          <div className="space-y-2">
            <Label>Date of Joining *</Label>
            <Input
              type="date"
              value={formData.date_of_joining}
              onChange={(e) => setFormData(prev => ({ ...prev, date_of_joining: e.target.value }))}
              required
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
              {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Create Employee
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
leave/
 LeaveRequestCard/
	import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, FileText, Check, X, Loader2 } from "lucide-react";
import moment from "moment";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";

export default function LeaveRequestCard({ 
  request, 
  employee,
  isAdmin = false,
  onApprove,
  onReject 
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [showRemarks, setShowRemarks] = useState(false);

  const statusColors = {
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
    rejected: "bg-rose-100 text-rose-700 border-rose-200"
  };

  const leaveTypeLabels = {
    paid_leave: "Paid Leave",
    sick_leave: "Sick Leave",
    unpaid_leave: "Unpaid Leave"
  };

  const handleAction = async (action) => {
    setIsLoading(true);
    try {
      if (action === "approve") {
        await onApprove?.(request.id, remarks);
      } else {
        await onReject?.(request.id, remarks);
      }
    } finally {
      setIsLoading(false);
      setShowRemarks(false);
      setRemarks("");
    }
  };

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {employee && (
              <Avatar className="w-12 h-12">
                <AvatarImage src={employee.profile_picture} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                  {employee.first_name?.[0]}{employee.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
            )}
            
            <div className="space-y-2">
              {employee && (
                <p className="font-semibold text-slate-900">
                  {employee.first_name} {employee.last_name}
                </p>
              )}
              
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="bg-slate-50">
                  {leaveTypeLabels[request.leave_type]}
                </Badge>
                <Badge 
                  variant="outline" 
                  className={cn("capitalize", statusColors[request.status])}
                >
                  {request.status}
                </Badge>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {moment(request.start_date).format("MMM D")} - {moment(request.end_date).format("MMM D, YYYY")}
                </span>
                <span className="font-medium">
                  {request.total_days} day(s)
                </span>
              </div>
              
              {request.reason && (
                <p className="text-sm text-slate-500 line-clamp-2">
                  {request.reason}
                </p>
              )}
              
              {request.attachment_url && (
                <a 
                  href={request.attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                >
                  <FileText className="w-4 h-4" />
                  View Attachment
                </a>
              )}
              
              {request.admin_remarks && (
                <div className="mt-2 p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs font-medium text-slate-500 mb-1">Admin Remarks:</p>
                  <p className="text-sm text-slate-700">{request.admin_remarks}</p>
                </div>
              )}
            </div>
          </div>
          
          {isAdmin && request.status === "pending" && (
            <div className="flex flex-col gap-2">
              {showRemarks ? (
                <div className="space-y-2 w-48">
                  <Textarea
                    placeholder="Add remarks (optional)"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction("reject")}
                      disabled={isLoading}
                      className="flex-1 text-rose-600 hover:text-rose-700"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAction("approve")}
                      disabled={isLoading}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowRemarks(true)}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowRemarks(true)}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
LeaveRequestForm/
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { Loader2, Upload, X } from "lucide-react";
import moment from "moment";

export default function LeaveRequestForm({ 
  employeeId, 
  open, 
  onOpenChange, 
  onSuccess 
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    leave_type: "",
    start_date: "",
    end_date: "",
    reason: "",
    attachment_url: ""
  });
  const [uploadingFile, setUploadingFile] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, attachment_url: file_url }));
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploadingFile(false);
    }
  };

  const calculateTotalDays = () => {
    if (!formData.start_date || !formData.end_date) return 0;
    const start = moment(formData.start_date);
    const end = moment(formData.end_date);
    return end.diff(start, "days") + 1;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await base44.entities.LeaveRequest.create({
        ...formData,
        employee_id: employeeId,
        total_days: calculateTotalDays(),
        status: "pending"
      });
      
      setFormData({
        leave_type: "",
        start_date: "",
        end_date: "",
        reason: "",
        attachment_url: ""
      });
      
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Submit error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Apply for Leave</DialogTitle>
          <DialogDescription>
            Submit your leave request for approval
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Leave Type</Label>
            <Select
              value={formData.leave_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, leave_type: value }))}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select leave type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paid_leave">Paid Leave</SelectItem>
                <SelectItem value="sick_leave">Sick Leave</SelectItem>
                <SelectItem value="unpaid_leave">Unpaid Leave</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                min={formData.start_date}
                required
              />
            </div>
          </div>
          
          {calculateTotalDays() > 0 && (
            <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
              Total: <span className="font-semibold">{calculateTotalDays()} day(s)</span>
            </div>
          )}
          
          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea
              value={formData.reason}
              onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Please provide a reason for your leave..."
              rows={3}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label>Attachment (Optional)</Label>
            {formData.attachment_url ? (
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                <span className="text-sm text-slate-600 flex-1 truncate">
                  File uploaded
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setFormData(prev => ({ ...prev, attachment_url: "" }))}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="attachment"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                />
                <Label
                  htmlFor="attachment"
                  className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  {uploadingFile ? (
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-slate-400" />
                      <span className="text-sm text-slate-500">
                        Upload medical certificate or document
                      </span>
                    </>
                  )}
                </Label>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Submit Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
profile/
ProfileTabs/
	import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useState } from "react";
import { Loader2, Upload, FileText, Download } from "lucide-react";
import SalaryBreakdown from "../salary/SalaryBreakdown";
import SalaryForm from "../salary/SalaryForm";
import moment from "moment";

export default function ProfileTabs({ 
  employee, 
  salary,
  isAdmin = false, 
  isOwnProfile = false,
  onUpdate 
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [showSalaryForm, setShowSalaryForm] = useState(false);
  const [formData, setFormData] = useState({
    date_of_birth: employee?.date_of_birth || "",
    gender: employee?.gender || "",
    marital_status: employee?.marital_status || "",
    nationality: employee?.nationality || "",
    address: employee?.address || "",
    bank_name: employee?.bank_name || "",
    account_number: employee?.account_number || "",
    ifsc_code: employee?.ifsc_code || "",
    pan_number: employee?.pan_number || "",
    uan_number: employee?.uan_number || ""
  });

  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingResume(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.Employee.update(employee.id, { resume_url: file_url });
      onUpdate?.();
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploadingResume(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await base44.entities.Employee.update(employee.id, formData);
      onUpdate?.();
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const canEdit = isAdmin || isOwnProfile;

  return (
    <>
      <Tabs defaultValue="resume" className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-xl mb-6">
          <TabsTrigger value="resume" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Resume
          </TabsTrigger>
          <TabsTrigger value="private" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Private Info
          </TabsTrigger>
          {(isAdmin || isOwnProfile) && (
            <TabsTrigger value="salary" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              Salary Info
            </TabsTrigger>
          )}
          <TabsTrigger value="bank" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Bank Details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resume">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Resume / CV</CardTitle>
            </CardHeader>
            <CardContent>
              {employee?.resume_url ? (
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Resume.pdf</p>
                      <p className="text-sm text-slate-500">Uploaded document</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a 
                      href={employee.resume_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </a>
                    {canEdit && (
                      <Label htmlFor="resume-upload" className="cursor-pointer">
                        <Button variant="outline" size="sm" asChild>
                          <span>
                            {uploadingResume ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                              <Upload className="w-4 h-4 mr-2" />
                            )}
                            Replace
                          </span>
                        </Button>
                      </Label>
                    )}
                  </div>
                </div>
              ) : canEdit ? (
                <Label
                  htmlFor="resume-upload"
                  className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-xl cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  {uploadingResume ? (
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                  ) : (
                    <>
                      <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center">
                        <Upload className="w-7 h-7 text-slate-400" />
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-slate-700">Upload Resume</p>
                        <p className="text-sm text-slate-500">PDF, DOC up to 10MB</p>
                      </div>
                    </>
                  )}
                </Label>
              ) : (
                <p className="text-center text-slate-500 py-8">No resume uploaded</p>
              )}
              <Input
                id="resume-upload"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleResumeUpload}
                className="hidden"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="private">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Private Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <Input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}
                    disabled={!canEdit}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Marital Status</Label>
                  <Select
                    value={formData.marital_status}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, marital_status: value }))}
                    disabled={!canEdit}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="married">Married</SelectItem>
                      <SelectItem value="divorced">Divorced</SelectItem>
                      <SelectItem value="widowed">Widowed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nationality</Label>
                  <Input
                    value={formData.nationality}
                    onChange={(e) => setFormData(prev => ({ ...prev, nationality: e.target.value }))}
                    placeholder="Indian"
                    disabled={!canEdit}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Address</Label>
                <Textarea
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Full address"
                  rows={3}
                  disabled={!canEdit}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label>Date of Joining</Label>
                  <Input
                    value={employee?.date_of_joining ? moment(employee.date_of_joining).format("YYYY-MM-DD") : ""}
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label>Employee Code</Label>
                  <Input value={employee?.employee_code || employee?.login_id || ""} disabled />
                </div>
              </div>
              
              {canEdit && (
                <div className="flex justify-end pt-4">
                  <Button onClick={handleSave} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Save Changes
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="salary">
          <div className="space-y-4">
            <SalaryBreakdown salary={salary} />
            {isAdmin && (
              <div className="flex justify-end">
                <Button onClick={() => setShowSalaryForm(true)} className="bg-blue-600 hover:bg-blue-700">
                  {salary ? "Edit Salary" : "Set Salary"}
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="bank">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Bank Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Input
                    value={formData.bank_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, bank_name: e.target.value }))}
                    placeholder="State Bank of India"
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <Input
                    value={formData.account_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, account_number: e.target.value }))}
                    placeholder="XXXXXXXX1234"
                    disabled={!canEdit}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>IFSC Code</Label>
                <Input
                  value={formData.ifsc_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, ifsc_code: e.target.value }))}
                  placeholder="SBIN0001234"
                  disabled={!canEdit}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label>PAN Number</Label>
                  <Input
                    value={formData.pan_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, pan_number: e.target.value }))}
                    placeholder="ABCDE1234F"
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label>UAN Number</Label>
                  <Input
                    value={formData.uan_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, uan_number: e.target.value }))}
                    placeholder="100000000000"
                    disabled={!canEdit}
                  />
                </div>
              </div>
              
              {canEdit && (
                <div className="flex justify-end pt-4">
                  <Button onClick={handleSave} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Save Changes
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <SalaryForm
        employeeId={employee?.id}
        existingSalary={salary}
        open={showSalaryForm}
        onOpenChange={setShowSalaryForm}
        onSuccess={onUpdate}
      />
    </>
  );
}
salary/
SalaryBreakdown/
	import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function SalaryBreakdown({ salary }) {
  if (!salary) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6 text-center text-slate-500">
          No salary information available
        </CardContent>
      </Card>
    );
  }

  const calculateComponent = (type, value, baseAmount) => {
    if (type === "percentage") {
      return (baseAmount * value) / 100;
    }
    return value || 0;
  };

  const baseWage = salary.base_wage || 0;
  
  const basic = calculateComponent(
    salary.basic_type, 
    salary.basic_value, 
    baseWage
  );
  
  const hra = calculateComponent(
    salary.hra_type, 
    salary.hra_value, 
    basic
  );
  
  const standardAllowance = calculateComponent(
    salary.standard_allowance_type, 
    salary.standard_allowance_value, 
    baseWage
  );
  
  const performanceBonus = calculateComponent(
    salary.performance_bonus_type, 
    salary.performance_bonus_value, 
    baseWage
  );
  
  const lta = calculateComponent(
    salary.lta_type, 
    salary.lta_value, 
    baseWage
  );
  
  const fixedAllowance = calculateComponent(
    salary.fixed_allowance_type, 
    salary.fixed_allowance_value, 
    baseWage
  );

  const totalEarnings = basic + hra + standardAllowance + performanceBonus + lta + fixedAllowance;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(amount);
  };

  const components = [
    { label: "Basic Salary", value: basic, type: salary.basic_type, percentage: salary.basic_value },
    { label: "HRA", value: hra, type: salary.hra_type, percentage: salary.hra_value, ofLabel: "of Basic" },
    { label: "Standard Allowance", value: standardAllowance, type: salary.standard_allowance_type, percentage: salary.standard_allowance_value },
    { label: "Performance Bonus", value: performanceBonus, type: salary.performance_bonus_type, percentage: salary.performance_bonus_value },
    { label: "Leave Travel Allowance", value: lta, type: salary.lta_type, percentage: salary.lta_value },
    { label: "Fixed Allowance", value: fixedAllowance, type: salary.fixed_allowance_type, percentage: salary.fixed_allowance_value }
  ].filter(c => c.value > 0);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Salary Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
          <p className="text-sm text-slate-600">Base Wage ({salary.wage_type})</p>
          <p className="text-2xl font-bold text-slate-900">
            {formatCurrency(baseWage)}
          </p>
        </div>
        
        <Separator />
        
        <div className="space-y-3">
          {components.map((comp, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">{comp.label}</p>
                {comp.type === "percentage" && (
                  <p className="text-xs text-slate-500">
                    {comp.percentage}% {comp.ofLabel || "of wage"}
                  </p>
                )}
              </div>
              <p className="font-semibold text-slate-900">
                {formatCurrency(comp.value)}
              </p>
            </div>
          ))}
        </div>
        
        <Separator />
        
        <div className="flex items-center justify-between pt-2">
          <p className="font-semibold text-slate-900">Total Earnings</p>
          <p className="text-xl font-bold text-emerald-600">
            {formatCurrency(totalEarnings)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
SalaryForm/
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SalaryForm({ 
  employeeId, 
  existingSalary,
  open, 
  onOpenChange, 
  onSuccess 
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    wage_type: "fixed",
    base_wage: "",
    basic_type: "percentage",
    basic_value: "50",
    hra_type: "percentage",
    hra_value: "50",
    standard_allowance_type: "fixed",
    standard_allowance_value: "",
    performance_bonus_type: "fixed",
    performance_bonus_value: "",
    lta_type: "fixed",
    lta_value: "",
    fixed_allowance_type: "fixed",
    fixed_allowance_value: "",
    effective_from: new Date().toISOString().split("T")[0]
  });

  useEffect(() => {
    if (existingSalary) {
      setFormData({
        wage_type: existingSalary.wage_type || "fixed",
        base_wage: existingSalary.base_wage?.toString() || "",
        basic_type: existingSalary.basic_type || "percentage",
        basic_value: existingSalary.basic_value?.toString() || "50",
        hra_type: existingSalary.hra_type || "percentage",
        hra_value: existingSalary.hra_value?.toString() || "50",
        standard_allowance_type: existingSalary.standard_allowance_type || "fixed",
        standard_allowance_value: existingSalary.standard_allowance_value?.toString() || "",
        performance_bonus_type: existingSalary.performance_bonus_type || "fixed",
        performance_bonus_value: existingSalary.performance_bonus_value?.toString() || "",
        lta_type: existingSalary.lta_type || "fixed",
        lta_value: existingSalary.lta_value?.toString() || "",
        fixed_allowance_type: existingSalary.fixed_allowance_type || "fixed",
        fixed_allowance_value: existingSalary.fixed_allowance_value?.toString() || "",
        effective_from: existingSalary.effective_from || new Date().toISOString().split("T")[0]
      });
    }
  }, [existingSalary]);

  const calculateTotal = () => {
    const base = parseFloat(formData.base_wage) || 0;
    
    const getValue = (type, value) => {
      const numValue = parseFloat(value) || 0;
      if (type === "percentage") {
        return (base * numValue) / 100;
      }
      return numValue;
    };
    
    const basic = getValue(formData.basic_type, formData.basic_value);
    const hra = formData.hra_type === "percentage" 
      ? (basic * (parseFloat(formData.hra_value) || 0)) / 100
      : parseFloat(formData.hra_value) || 0;
    const standard = getValue(formData.standard_allowance_type, formData.standard_allowance_value);
    const bonus = getValue(formData.performance_bonus_type, formData.performance_bonus_value);
    const lta = getValue(formData.lta_type, formData.lta_value);
    const fixed = getValue(formData.fixed_allowance_type, formData.fixed_allowance_value);
    
    return basic + hra + standard + bonus + lta + fixed;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    const base = parseFloat(formData.base_wage) || 0;
    const total = calculateTotal();
    
    if (total > base) {
      setError(`Total components (₹${total.toFixed(0)}) exceed base wage (₹${base.toFixed(0)})`);
      return;
    }
    
    setIsLoading(true);
    
    try {
      const salaryData = {
        employee_id: employeeId,
        wage_type: formData.wage_type,
        base_wage: parseFloat(formData.base_wage) || 0,
        basic_type: formData.basic_type,
        basic_value: parseFloat(formData.basic_value) || 0,
        hra_type: formData.hra_type,
        hra_value: parseFloat(formData.hra_value) || 0,
        standard_allowance_type: formData.standard_allowance_type,
        standard_allowance_value: parseFloat(formData.standard_allowance_value) || 0,
        performance_bonus_type: formData.performance_bonus_type,
        performance_bonus_value: parseFloat(formData.performance_bonus_value) || 0,
        lta_type: formData.lta_type,
        lta_value: parseFloat(formData.lta_value) || 0,
        fixed_allowance_type: formData.fixed_allowance_type,
        fixed_allowance_value: parseFloat(formData.fixed_allowance_value) || 0,
        effective_from: formData.effective_from
      };
      
      if (existingSalary) {
        await base44.entities.Salary.update(existingSalary.id, salaryData);
      } else {
        await base44.entities.Salary.create(salaryData);
      }
      
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Submit error:", error);
      setError("Failed to save salary information");
    } finally {
      setIsLoading(false);
    }
  };

  const ComponentField = ({ label, typeKey, valueKey }) => (
    <div className="grid grid-cols-3 gap-2 items-end">
      <div className="col-span-1">
        <Label className="text-xs">{label}</Label>
        <Select
          value={formData[typeKey]}
          onValueChange={(value) => setFormData(prev => ({ ...prev, [typeKey]: value }))}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fixed">Fixed</SelectItem>
            <SelectItem value="percentage">%</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-2">
        <Input
          type="number"
          value={formData[valueKey]}
          onChange={(e) => setFormData(prev => ({ ...prev, [valueKey]: e.target.value }))}
          placeholder={formData[typeKey] === "percentage" ? "%" : "Amount"}
          className="h-9"
        />
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existingSalary ? "Edit Salary" : "Set Salary Structure"}</DialogTitle>
          <DialogDescription>
            Configure salary components for this employee
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Wage Type</Label>
              <Select
                value={formData.wage_type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, wage_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Wage</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Base Wage (₹)</Label>
              <Input
                type="number"
                value={formData.base_wage}
                onChange={(e) => setFormData(prev => ({ ...prev, base_wage: e.target.value }))}
                placeholder="50000"
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Effective From</Label>
            <Input
              type="date"
              value={formData.effective_from}
              onChange={(e) => setFormData(prev => ({ ...prev, effective_from: e.target.value }))}
              required
            />
          </div>
          
          <div className="border-t pt-4 mt-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Salary Components</h4>
            <div className="space-y-3">
              <ComponentField label="Basic" typeKey="basic_type" valueKey="basic_value" />
              <ComponentField label="HRA (% of Basic)" typeKey="hra_type" valueKey="hra_value" />
              <ComponentField label="Standard Allowance" typeKey="standard_allowance_type" valueKey="standard_allowance_value" />
              <ComponentField label="Performance Bonus" typeKey="performance_bonus_type" valueKey="performance_bonus_value" />
              <ComponentField label="LTA" typeKey="lta_type" valueKey="lta_value" />
              <ComponentField label="Fixed Allowance" typeKey="fixed_allowance_type" valueKey="fixed_allowance_value" />
            </div>
          </div>
          
          {formData.base_wage && (
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Total Components:</span>
                <span className="font-semibold">₹{calculateTotal().toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-slate-600">Base Wage:</span>
                <span className="font-semibold">₹{parseFloat(formData.base_wage || 0).toLocaleString()}</span>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
              {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {existingSalary ? "Update Salary" : "Save Salary"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
]
Entities/[
Employee/
{
  "name": "Employee",
  "type": "object",
  "properties": {
    "login_id": {
      "type": "string",
      "description": "Auto-generated login ID (e.g., OIDOD20230001)"
    },
    "employee_code": {
      "type": "string",
      "description": "Employee code"
    },
    "first_name": {
      "type": "string"
    },
    "last_name": {
      "type": "string"
    },
    "email": {
      "type": "string",
      "format": "email"
    },
    "phone": {
      "type": "string"
    },
    "role": {
      "type": "string",
      "enum": [
        "admin",
        "hr_officer",
        "employee"
      ],
      "default": "employee"
    },
    "profile_picture": {
      "type": "string",
      "description": "URL to profile picture"
    },
    "resume_url": {
      "type": "string",
      "description": "URL to uploaded resume"
    },
    "date_of_birth": {
      "type": "string",
      "format": "date"
    },
    "gender": {
      "type": "string",
      "enum": [
        "male",
        "female",
        "other"
      ]
    },
    "marital_status": {
      "type": "string",
      "enum": [
        "single",
        "married",
        "divorced",
        "widowed"
      ]
    },
    "nationality": {
      "type": "string"
    },
    "address": {
      "type": "string"
    },
    "date_of_joining": {
      "type": "string",
      "format": "date"
    },
    "department": {
      "type": "string"
    },
    "designation": {
      "type": "string"
    },
    "bank_name": {
      "type": "string"
    },
    "account_number": {
      "type": "string"
    },
    "ifsc_code": {
      "type": "string"
    },
    "pan_number": {
      "type": "string"
    },
    "uan_number": {
      "type": "string"
    },
    "status": {
      "type": "string",
      "enum": [
        "active",
        "inactive",
        "on_leave"
      ],
      "default": "active"
    },
    "company_code": {
      "type": "string",
      "description": "Company code for login ID generation"
    }
  },
  "required": [
    "first_name",
    "last_name",
    "email",
    "role"
  ]
}
Attendance/
{
  "name": "Attendance",
  "type": "object",
  "properties": {
    "employee_id": {
      "type": "string",
      "description": "Reference to Employee"
    },
    "date": {
      "type": "string",
      "format": "date"
    },
    "check_in": {
      "type": "string",
      "description": "Check-in time ISO string"
    },
    "check_out": {
      "type": "string",
      "description": "Check-out time ISO string"
    },
    "work_hours": {
      "type": "number",
      "description": "Total work hours"
    },
    "extra_hours": {
      "type": "number",
      "description": "Overtime hours"
    },
    "status": {
      "type": "string",
      "enum": [
        "present",
        "absent",
        "half_day",
        "leave",
        "pending"
      ],
      "default": "pending"
    },
    "notes": {
      "type": "string"
    }
  },
  "required": [
    "employee_id",
    "date"
  ]
}
LeaveRequest/
{
  "name": "LeaveRequest",
  "type": "object",
  "properties": {
    "employee_id": {
      "type": "string",
      "description": "Reference to Employee"
    },
    "leave_type": {
      "type": "string",
      "enum": [
        "paid_leave",
        "sick_leave",
        "unpaid_leave"
      ]
    },
    "start_date": {
      "type": "string",
      "format": "date"
    },
    "end_date": {
      "type": "string",
      "format": "date"
    },
    "total_days": {
      "type": "number"
    },
    "reason": {
      "type": "string"
    },
    "attachment_url": {
      "type": "string",
      "description": "URL to attachment (medical certificate, etc.)"
    },
    "status": {
      "type": "string",
      "enum": [
        "pending",
        "approved",
        "rejected"
      ],
      "default": "pending"
    },
    "admin_remarks": {
      "type": "string",
      "description": "Comments from admin/HR"
    },
    "reviewed_by": {
      "type": "string",
      "description": "Email of admin who reviewed"
    },
    "reviewed_at": {
      "type": "string",
      "format": "date-time"
    }
  },
  "required": [
    "employee_id",
    "leave_type",
    "start_date",
    "end_date"
  ]
}
Salary/
{
  "name": "Salary",
  "type": "object",
  "properties": {
    "employee_id": {
      "type": "string",
      "description": "Reference to Employee"
    },
    "wage_type": {
      "type": "string",
      "enum": [
        "fixed",
        "hourly"
      ],
      "default": "fixed"
    },
    "base_wage": {
      "type": "number",
      "description": "Total fixed wage amount"
    },
    "basic_type": {
      "type": "string",
      "enum": [
        "fixed",
        "percentage"
      ],
      "default": "percentage"
    },
    "basic_value": {
      "type": "number",
      "description": "Basic salary value or percentage"
    },
    "hra_type": {
      "type": "string",
      "enum": [
        "fixed",
        "percentage"
      ],
      "default": "percentage"
    },
    "hra_value": {
      "type": "number",
      "description": "HRA value or percentage of basic"
    },
    "standard_allowance_type": {
      "type": "string",
      "enum": [
        "fixed",
        "percentage"
      ],
      "default": "fixed"
    },
    "standard_allowance_value": {
      "type": "number"
    },
    "performance_bonus_type": {
      "type": "string",
      "enum": [
        "fixed",
        "percentage"
      ],
      "default": "fixed"
    },
    "performance_bonus_value": {
      "type": "number"
    },
    "lta_type": {
      "type": "string",
      "enum": [
        "fixed",
        "percentage"
      ],
      "default": "fixed"
    },
    "lta_value": {
      "type": "number",
      "description": "Leave Travel Allowance"
    },
    "fixed_allowance_type": {
      "type": "string",
      "enum": [
        "fixed",
        "percentage"
      ],
      "default": "fixed"
    },
    "fixed_allowance_value": {
      "type": "number"
    },
    "effective_from": {
      "type": "string",
      "format": "date"
    }
  },
  "required": [
    "employee_id",
    "base_wage"
  ]
}
Company/
{
  "name": "Company",
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    },
    "code": {
      "type": "string",
      "description": "Short company code for login ID generation (e.g., OI for Odion India)"
    },
    "logo_url": {
      "type": "string"
    },
    "admin_count": {
      "type": "number",
      "default": 0,
      "description": "Number of admin accounts (max 2)"
    }
  },
  "required": [
    "name",
    "code"
  ]
}
LeaveBalance/
{
  "name": "LeaveBalance",
  "type": "object",
  "properties": {
    "employee_id": {
      "type": "string",
      "description": "Reference to Employee"
    },
    "year": {
      "type": "number"
    },
    "paid_leave_total": {
      "type": "number",
      "default": 12
    },
    "paid_leave_used": {
      "type": "number",
      "default": 0
    },
    "sick_leave_total": {
      "type": "number",
      "default": 6
    },
    "sick_leave_used": {
      "type": "number",
      "default": 0
    },
    "unpaid_leave_used": {
      "type": "number",
      "default": 0
    }
  },
  "required": [
    "employee_id",
    "year"
  ]
}
]
Layout.js/
import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  Users, 
  Clock, 
  Calendar, 
  Home,
  Menu,
  LogOut,
  User,
  Settings,
  Building2
} from "lucide-react";
import StatusBadge from "@/components/common/StatusBadge";
import moment from "moment";

export default function Layout({ children, currentPageName }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (e) {
        // Not logged in
      }
    };
    loadUser();
  }, []);

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list()
  });

  const { data: company } = useQuery({
    queryKey: ["company"],
    queryFn: async () => {
      const companies = await base44.entities.Company.list();
      return companies[0];
    }
  });

  const today = moment().format("YYYY-MM-DD");
  
  const { data: todayAttendance = [] } = useQuery({
    queryKey: ["myTodayAttendance", today],
    queryFn: () => base44.entities.Attendance.filter({ date: today })
  });

  useEffect(() => {
    if (currentUser && employees.length > 0) {
      const emp = employees.find(e => e.email === currentUser.email);
      setCurrentEmployee(emp);
    }
  }, [currentUser, employees]);

  // Don't show layout on Setup page
  if (currentPageName === "Setup") {
    return <>{children}</>;
  }

  const myAttendance = todayAttendance.find(a => a.employee_id === currentEmployee?.id);
  const attendanceStatus = myAttendance?.check_in && !myAttendance?.check_out 
    ? "present" 
    : myAttendance?.check_out 
      ? "present" 
      : "pending";

  const navigation = [
    { name: "Dashboard", href: "Dashboard", icon: Home },
    { name: "Employees", href: "Employees", icon: Users },
    { name: "Attendance", href: "Attendance", icon: Clock },
    { name: "Time Off", href: "TimeOff", icon: Calendar },
  ];

  const handleLogout = () => {
    base44.auth.logout();
  };

  const NavLinks = ({ mobile = false }) => (
    <>
      {navigation.map((item) => {
        const isActive = currentPageName === item.href;
        return (
          <Link
            key={item.name}
            to={createPageUrl(item.href)}
            onClick={() => mobile && setMobileMenuOpen(false)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? "bg-blue-50 text-blue-600"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <item.icon className="w-4 h-4" />
            {item.name}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Mobile Menu */}
            <div className="flex items-center gap-4">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild className="lg:hidden">
                  <Button variant="ghost" size="icon">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-4">
                  <div className="flex items-center gap-3 mb-6">
                    {company?.logo_url ? (
                      <img 
                        src={company.logo_url} 
                        alt={company.name}
                        className="w-10 h-10 object-contain rounded"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-white" />
                      </div>
                    )}
                    <div>
                      <h2 className="font-bold text-slate-900">
                        {company?.name || "Dayflow"}
                      </h2>
                      <p className="text-xs text-slate-500">HRMS</p>
                    </div>
                  </div>
                  <nav className="space-y-1">
                    <NavLinks mobile />
                  </nav>
                </SheetContent>
              </Sheet>

              <Link to={createPageUrl("Dashboard")} className="flex items-center gap-3">
                {company?.logo_url ? (
                  <img 
                    src={company.logo_url} 
                    alt={company.name}
                    className="w-10 h-10 object-contain rounded"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                )}
                <div className="hidden sm:block">
                  <h1 className="font-bold text-slate-900">
                    {company?.name || "Dayflow"}
                  </h1>
                  <p className="text-xs text-slate-500">Human Resource Management</p>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              <NavLinks />
            </nav>

            {/* Right Section */}
            <div className="flex items-center gap-4">
              {/* Attendance Status */}
              {currentEmployee && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full">
                  <StatusBadge status={attendanceStatus} size="dot" />
                  <span className="text-xs font-medium text-slate-600 capitalize">
                    {attendanceStatus === "pending" ? "Not Checked In" : "Checked In"}
                  </span>
                </div>
              )}

              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                    <Avatar className="h-10 w-10 ring-2 ring-slate-100">
                      <AvatarImage src={currentEmployee?.profile_picture} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                        {currentEmployee?.first_name?.[0]}{currentEmployee?.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="font-medium text-slate-900">
                      {currentEmployee?.first_name} {currentEmployee?.last_name}
                    </p>
                    <p className="text-sm text-slate-500">{currentEmployee?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <Link to={createPageUrl("MyProfile")}>
                    <DropdownMenuItem>
                      <User className="w-4 h-4 mr-2" />
                      My Profile
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {children}
      </main>
    </div>
  );
}


