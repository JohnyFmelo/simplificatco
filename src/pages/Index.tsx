import TCOForm from "@/components/tco/TCOForm";
import { useNavigate } from "react-router-dom";
import React from "react";

const Index = () => {
  const navigate = useNavigate();
  React.useEffect(() => {
    const rgpm = localStorage.getItem("rgpm") || sessionStorage.getItem("rgpm");
    if (!rgpm) navigate("/login");
  }, [navigate]);
  return <TCOForm />;
};

export default Index;
