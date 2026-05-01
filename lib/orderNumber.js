function sanitizeText(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

export function getDisplayOrderNumber(orderLike = {}) {
  const shortCandidate = sanitizeText(
    orderLike?.shortOrderNumber ?? orderLike?.orderNumber ?? orderLike?.displayOrderNumber
  );

  if (shortCandidate && /^\d+$/.test(shortCandidate)) {
    return shortCandidate.padStart(5, '0');
  }

  const idCandidate = sanitizeText(orderLike?._id ?? orderLike?.id ?? orderLike?.orderId);
  if (!idCandidate) return '';

  if (idCandidate.length <= 8) return idCandidate.toUpperCase();
  return idCandidate.slice(-8).toUpperCase();
}

export function getDisplayOrderNumberFromParts(shortOrderNumber, orderId) {
  return getDisplayOrderNumber({ shortOrderNumber, _id: orderId });
}
