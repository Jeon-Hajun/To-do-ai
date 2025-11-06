// src/hooks/useForm.js
import { useState } from "react"; // <- 반드시 추가

export default function useForm(initialValues) {
  const [values, setValues] = useState(initialValues);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues({ ...values, [name]: value });
  };

  const resetForm = () => setValues(initialValues);

  return { values, handleChange, resetForm };
}
