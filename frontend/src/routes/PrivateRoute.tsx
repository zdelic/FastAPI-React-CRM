import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isAuthenticated } from "../utils/auth";

type Props = { children: React.ReactElement };

export default function PrivateRoute({ children }: Props) {
  const authed = isAuthenticated();
  const loc = useLocation();

  if (!authed) {
    return <Navigate to="/" replace state={{ from: loc }} />;
  }
  return children;
}
