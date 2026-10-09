import { useSelector } from "react-redux";
import { Routes, Route, Navigate } from "react-router-dom";
import greenRoutes from "../public/GeneralRoutes";

export default function Authorization() {
  const candidateAuth = useSelector((state) => state.candidateFunction.isAuthenticated);
  const examinerAuth = useSelector((state) => state.examinerFunction.isAuthenticated);
  const adminAuth = useSelector((state) => state.adminFunction.isAuthenticated);

  return (
    <Routes>
      {greenRoutes.map((req, index) => {
        if (req.isPublic) {
          return <Route key={index} path={req.path} element={req.element} />;
        }

        if (req.isCandidate) {
          return (
            <Route
              key={index}
              path={req.path}
              element={candidateAuth ? req.element : <Navigate to="/candidate" replace />}
            />
          );
        }

        if (req.isExaminer) {
          return (
            <Route
              key={index}
              path={req.path}
              element={examinerAuth ? req.element : <Navigate to="/examiner" replace />}
            />
          );
        }

        if (req.isAdmin) {
          return (
            <Route
              key={index}
              path={req.path}
              element={adminAuth ? req.element : <Navigate to="/admin" replace />}
            />
          );
        }

        return null;
      })}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
