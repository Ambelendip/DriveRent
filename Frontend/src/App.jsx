import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";

import Home from "./pages/CameroonHome";
import Cars from "./pages/Cars";
import Services from "./pages/Services";
import CarDetails from "./pages/CarDetails";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Bookings from "./pages/Bookings";
import Payments from "./pages/Payments";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ManageCars from "./pages/admin/ManageCars";
import ManageBookings from "./pages/admin/ManageBookings";
import ManageCustomers from "./pages/admin/ManageCustomers";
import ManagePayments from "./pages/admin/ManagePayments";
import ManageContent from "./pages/admin/ManageContent";
import ManageServiceOrders from "./pages/admin/ManageServiceOrders";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <>
      <Navbar />
      <main className="page">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cars" element={<Cars />} />
          <Route path="/cars/:carId" element={<CarDetails />} />
          <Route path="/services" element={<Services />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/bookings" element={<Bookings />} />
            <Route path="/dashboard/profile" element={<Profile />} />
            <Route path="/dashboard/payments" element={<Payments />} />
            <Route path="/dashboard/notifications" element={<Notifications />} />
          </Route>

          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/cars" element={<ManageCars />} />
            <Route path="/admin/bookings" element={<ManageBookings />} />
            <Route path="/admin/customers" element={<ManageCustomers />} />
            <Route path="/admin/payments" element={<ManagePayments />} />
            <Route path="/admin/content" element={<ManageContent />} />
            <Route path="/admin/service-orders" element={<ManageServiceOrders />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </>
  );
}