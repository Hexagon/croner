// Minimal test harness, so that the tests have no dependencies either.
#ifndef CRONER_TEST_MAIN_HPP
#define CRONER_TEST_MAIN_HPP

#include <functional>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

namespace croner_test {

struct TestCase {
  const char* name;
  std::function<void()> fn;
};

inline std::vector<TestCase>& registry() {
  static std::vector<TestCase> r;
  return r;
}

struct Registrar {
  Registrar(const char* name, std::function<void()> fn) { registry().push_back({name, std::move(fn)}); }
};

struct Failure {
  std::string message;
};

inline int& failures() {
  static int f = 0;
  return f;
}

template <class T>
void show(std::ostream& os, const T& v) {
  os << v;
}

template <class T>
void show(std::ostream& os, const std::vector<T>& v) {
  os << "[";
  for (std::size_t i = 0; i < v.size(); ++i) {
    if (i) os << ", ";
    show(os, v[i]);
  }
  os << "]";
}

template <class A, class B>
void check_eq(const A& a, const B& b, const char* ea, const char* eb, const char* file, int line) {
  if (!(a == b)) {
    std::ostringstream os;
    os << file << ":" << line << ": expected " << ea << " == " << eb << "\n      got: ";
    show(os, a);
    os << "\n     want: ";
    show(os, b);
    throw Failure{os.str()};
  }
}

inline int run_all(int argc, char** argv) {
  const std::string filter = argc > 1 ? argv[1] : "";
  int passed = 0, failed = 0;
  for (const auto& t : registry()) {
    if (!filter.empty() && std::string(t.name).find(filter) == std::string::npos) continue;
    try {
      t.fn();
      ++passed;
    } catch (const Failure& f) {
      ++failed;
      std::cout << "FAIL " << t.name << "\n  " << f.message << "\n";
    } catch (const std::exception& e) {
      ++failed;
      std::cout << "FAIL " << t.name << "\n  unexpected exception: " << e.what() << "\n";
    }
  }
  std::cout << passed << " passed, " << failed << " failed\n";
  return failed ? 1 : 0;
}

}  // namespace croner_test

#define CT_CONCAT2(a, b) a##b
#define CT_CONCAT(a, b) CT_CONCAT2(a, b)
#define TEST(name)                                                                        \
  static void CT_CONCAT(test_fn_, __LINE__)();                                            \
  static croner_test::Registrar CT_CONCAT(test_reg_, __LINE__)(name, CT_CONCAT(test_fn_, __LINE__)); \
  static void CT_CONCAT(test_fn_, __LINE__)()

#define CHECK(cond)                                                                   \
  do {                                                                                \
    if (!(cond)) {                                                                    \
      std::ostringstream os_;                                                         \
      os_ << __FILE__ << ":" << __LINE__ << ": CHECK(" #cond ") failed";              \
      throw croner_test::Failure{os_.str()};                                          \
    }                                                                                 \
  } while (0)

#define CHECK_EQ(a, b) croner_test::check_eq((a), (b), #a, #b, __FILE__, __LINE__)

#define CHECK_THROWS(expr)                                                            \
  do {                                                                                \
    bool thrown_ = false;                                                             \
    try {                                                                             \
      (void)(expr);                                                                   \
    } catch (const croner::CronError&) {                                              \
      thrown_ = true;                                                                 \
    }                                                                                 \
    if (!thrown_) {                                                                   \
      std::ostringstream os_;                                                         \
      os_ << __FILE__ << ":" << __LINE__ << ": expected CronError from " #expr;       \
      throw croner_test::Failure{os_.str()};                                          \
    }                                                                                 \
  } while (0)

#endif  // CRONER_TEST_MAIN_HPP
