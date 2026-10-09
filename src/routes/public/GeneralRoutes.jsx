import Home from "../../pages/public/_index";
import OsceHome from "../../pages/public/OsceHome";
import CbtHome from "../../pages/public/CbtHome";
import Candidate from "../../pages/private/osce/candidate/candidate";
import Examiner from "../../pages/private/osce/examiner/examiner";
import Admin from "../../pages/private/osce/control-room/admin";
import CbtCandidate from "../../pages/private/cbt/candidate/CbtCandidate";
import CbtExaminer from "../../pages/private/cbt/examiner/CbtExaminer";
import CbtAdmin from "../../pages/private/cbt/control-room/CbtAdmin";

const greenRoutes = [
  { path: "/", name: "Examination Home", element: <Home />, isPublic: true },
  { path: "/osce", name: "OSCE Home", element: <OsceHome />, isPublic: true },
  { path: "/cbt", name: "CBT Home", element: <CbtHome />, isPublic: true },
  { path: "/c", name: "Candidate Short Link", element: <Candidate />, isPublic: true },
  { path: "/candidate", name: "Candidate Portal", element: <Candidate />, isPublic: true },
  { path: "/e", name: "Examiner Short Link", element: <Examiner />, isPublic: true },
  { path: "/examiner", name: "Examiner Portal", element: <Examiner />, isPublic: true },
  { path: "/admin", name: "Control Room Portal", element: <Admin />, isPublic: true },
  { path: "/cbt/candidate", name: "CBT Candidate Portal", element: <CbtCandidate />, isPublic: true },
  { path: "/cbt/examiner", name: "CBT Examiner Portal", element: <CbtExaminer />, isPublic: true },
  { path: "/cbt/admin", name: "CBT Control Room", element: <CbtAdmin />, isPublic: true },
];

export default greenRoutes;
