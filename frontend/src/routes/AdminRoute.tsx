import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getRoleFromToken } from "../utils/auth";

type Props = { children: React.ReactElement };

export default function AdminRoute({ children }: Props) {
  const role = React.useMemo(getRoleFromToken, []);
  const loc = useLocation();

  if (role !== "admin") {
    return <Navigate to="/dashboard" replace state={{ from: loc }} />;
  }
  return children;
}
