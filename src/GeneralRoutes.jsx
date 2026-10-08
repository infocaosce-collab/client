import Home from "./pages/_index";
import Candidate from "./pages/candidate";
import Examiner from "./pages/examiner";
import Admin from "./pages/admin";

const greenRoutes = [
  { path: "/", name: "OSCE Home", element: <Home />, isPublic: true },
  { path: "/c", name: "Candidate Short Link", element: <Candidate />, isPublic: true },
  { path: "/candidate", name: "Candidate Portal", element: <Candidate />, isPublic: true },
  { path: "/e", name: "Examiner Short Link", element: <Examiner />, isPublic: true },
  { path: "/examiner", name: "Examiner Portal", element: <Examiner />, isPublic: true },
  { path: "/admin", name: "Control Room Portal", element: <Admin />, isPublic: true },
];

export default greenRoutes;
