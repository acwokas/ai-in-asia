import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// All individual guide pages redirect to /guides while content is offline.
// Guide data is preserved in the database for reactivation.
const GuideDetail = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/guides", { replace: true });
  }, [navigate]);

  return null;
};

export default GuideDetail;
