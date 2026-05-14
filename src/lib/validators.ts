export const isValidEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const isValidCPF = (cpf: string): boolean => {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11 || /^(\d)\1{10}$/.test(cleaned)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cleaned.charAt(i)) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cleaned.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cleaned.charAt(i)) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cleaned.charAt(10))) return false;
  
  return true;
};

export const isValidIMEI = (imei: string): boolean => {
  const cleaned = imei.replace(/\D/g, '');
  if (cleaned.length !== 15) return false;
  
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let d = parseInt(cleaned.charAt(i));
    if (i % 2 !== 0) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
};

export const isValidPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 11;
};
