import SchemeDetailPage from "@/components/SchemeDetailPage";
import { schemeDetails } from "@/data/schemeDetails";

const MSMELoan = () => {
  return <SchemeDetailPage scheme={schemeDetails.msme} />;
};

export default MSMELoan;