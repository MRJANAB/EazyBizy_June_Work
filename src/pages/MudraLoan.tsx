import SchemeDetailPage from "@/components/SchemeDetailPage";
import { schemeDetails } from "@/data/schemeDetails";

const MudraLoan = () => {
  return <SchemeDetailPage scheme={schemeDetails.mudra} />;
};

export default MudraLoan;