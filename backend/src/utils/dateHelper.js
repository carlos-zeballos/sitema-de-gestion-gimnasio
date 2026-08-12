const addMonths = (date, months) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

const calculateExpirationDate = (startDateStr, tipo) => {
  const start = new Date(startDateStr + 'T00:00:00');
  let end;

  switch ((tipo || '').toLowerCase()) {
    case 'semanal':
      end = new Date(start);
      end.setDate(end.getDate() + 7);
      break;
    case 'quincenal':
      end = new Date(start);
      end.setDate(end.getDate() + 15);
      break;
    case 'mensual':
      end = addMonths(start, 1);
      break;
    default:
      end = addMonths(start, 1);
      break;
  }

  return end.toISOString().split('T')[0];
};

const isExpired = (endDateStr) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDateStr + 'T00:00:00');
  return end < today;
};

const getDaysDifference = (dateStr1, dateStr2) => {
  const d1 = new Date(dateStr1 + 'T00:00:00');
  const d2 = new Date(dateStr2 + 'T00:00:00');
  const diffTime = d1 - d2;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const membershipStatusSql = `
  CASE
    WHEN m.fecha_vencimiento < CURDATE() THEN 'Vencida'
    WHEN m.fecha_vencimiento <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 'Proxima_a_vencer'
    ELSE 'Activa'
  END
`;

module.exports = {
  calculateExpirationDate,
  isExpired,
  getDaysDifference,
  membershipStatusSql
};
