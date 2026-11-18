// Until the bureau provider's API is connected, delivery is the sample report rendered in the browser.
let provider = async () => ({ sample: true });

export function setReportProvider(fn) {
  provider = fn;
}

export function fetchReport(input) {
  return provider(input);
}
