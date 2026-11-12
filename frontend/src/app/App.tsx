import { Route, Routes } from "react-router-dom";

import HomePage from "@/pages/HomePage";
import NotFoundPage from "@/pages/NotFoundPage";
import OrderPlaceholderPage from "@/pages/OrderPlaceholderPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/order/:serviceType" element={<OrderPlaceholderPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
