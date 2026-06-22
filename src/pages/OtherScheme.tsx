import SchemeDetailPage from "@/components/SchemeDetailPage";
import { schemeDetails } from "@/data/schemeDetails";

const OtherSchemes = () => {
  return <SchemeDetailPage scheme={schemeDetails.other} />;
};

export default OtherSchemes;