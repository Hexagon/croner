// Croner for C++ example: evaluate patterns, and schedule a job.
#include <croner/croner.hpp>

#include <iostream>

int main() {
  // Evaluate: the next five runs of "every weekday at 09:30" in Stockholm
  croner::Options opts;
  opts.timezone = "Europe/Stockholm";
  croner::Cron weekdays("0 30 9 * * MON-FRI", opts);
  for (const auto& run : weekdays.next_runs(5)) {
    std::cout << "next: " << croner::to_iso_string(run) << "\n";
  }

  // Schedule: run every second, three times
  croner::Options limited;
  limited.max_runs = 3;
  croner::Cron job("* * * * * *", limited, [](croner::Cron& self) {
    std::cout << "tick, runs left: " << self.runs_left().value_or(-1) << "\n";
  });

  // Block until the job has no more runs
  job.join();
  std::cout << "done\n";
}
