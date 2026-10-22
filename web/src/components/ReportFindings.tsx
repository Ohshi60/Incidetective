import type { ReportFinding } from "../../../shared/types/report";
interface ReportFindingProps {
  findings: ReportFinding[];
}

export function ReportFindings({ findings }: ReportFindingProps) {
  return (
    <>
      {findings.map((finding) => {
        return (
          <section className="mt-8 space-y-6 bg-red-400 border border-blue-400 text-white">
            <p className="text-white">{finding.service}</p>
            <div className="flex flew-row justify-between">
              <h2 className="text-xl font-semibold text-white">
                {finding.pattern}
              </h2>
              <p>{finding.occurrences} occurrences</p>
            </div>
            <div className="flex flex-row justify-between">
              <p>First Seen {new Date(finding.firstSeen).toLocaleString()}</p>
              <p>Last Seen {new Date(finding.lastSeen).toLocaleString()}</p>
            </div>
            <p>Supporting evidence:</p>
            {finding.evidence.map((ev) => {
              return (
                <div className="flex flex-row justify-between">
                  <p>{ev.timestamp}</p>
                  <p>{ev.message}</p>
                </div>
              );
            })}
          </section>
        );
      })}
    </>
  );
}
