cmake_minimum_required(VERSION 3.14)

project(croner VERSION 0.1.0 LANGUAGES CXX
        DESCRIPTION "Cron expression parser and scheduler, a port of Croner for JavaScript"
        HOMEPAGE_URL "https://github.com/Hexagon/croner")

include(GNUInstallDirs)
include(CMakePackageConfigHelpers)

set(CRONER_IS_TOP_LEVEL OFF)
if(CMAKE_SOURCE_DIR STREQUAL PROJECT_SOURCE_DIR)
  set(CRONER_IS_TOP_LEVEL ON)
endif()

option(CRONER_BUILD_TESTS "Build the Croner tests" ${CRONER_IS_TOP_LEVEL})
option(CRONER_BUILD_EXAMPLES "Build the Croner examples" ${CRONER_IS_TOP_LEVEL})
option(CRONER_INSTALL "Generate the install target" ON)

find_package(Threads REQUIRED)

add_library(croner INTERFACE)
add_library(croner::croner ALIAS croner)
target_include_directories(croner INTERFACE
  $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
  $<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>)
target_compile_features(croner INTERFACE cxx_std_17)
target_link_libraries(croner INTERFACE Threads::Threads)

if(CRONER_BUILD_TESTS)
  enable_testing()
  add_executable(croner_test tests/croner_test.cpp)
  target_link_libraries(croner_test PRIVATE croner::croner)
  if(MSVC)
    # Windows has no zoneinfo directory, IANA zones come from std::chrono::tzdb (C++20)
    target_compile_features(croner_test PRIVATE cxx_std_20)
    target_compile_options(croner_test PRIVATE /W4 /permissive- /utf-8)
  else()
    target_compile_options(croner_test PRIVATE -Wall -Wextra -Wpedantic -Wconversion
                                               -Wsign-conversion -Wshadow)
  endif()
  add_test(NAME croner_test COMMAND croner_test)

  add_executable(croner_differential_driver tests/differential/driver.cpp)
  target_link_libraries(croner_differential_driver PRIVATE croner::croner)

  if(UNIX)
    add_executable(croner_tz_compare tests/tz_compare.cpp)
    target_link_libraries(croner_tz_compare PRIVATE croner::croner)
  endif()
endif()

if(CRONER_BUILD_EXAMPLES)
  add_executable(croner_example examples/basic.cpp)
  target_link_libraries(croner_example PRIVATE croner::croner)
endif()

if(CRONER_INSTALL)
  install(DIRECTORY include/croner DESTINATION ${CMAKE_INSTALL_INCLUDEDIR})
  install(TARGETS croner EXPORT croner-targets)
  install(EXPORT croner-targets NAMESPACE croner::
          DESTINATION ${CMAKE_INSTALL_DATADIR}/croner)
  configure_package_config_file(cmake/croner-config.cmake.in
    ${CMAKE_CURRENT_BINARY_DIR}/croner-config.cmake
    INSTALL_DESTINATION ${CMAKE_INSTALL_DATADIR}/croner)
  write_basic_package_version_file(${CMAKE_CURRENT_BINARY_DIR}/croner-config-version.cmake
    COMPATIBILITY SameMajorVersion ARCH_INDEPENDENT)
  install(FILES ${CMAKE_CURRENT_BINARY_DIR}/croner-config.cmake
                ${CMAKE_CURRENT_BINARY_DIR}/croner-config-version.cmake
          DESTINATION ${CMAKE_INSTALL_DATADIR}/croner)
  install(FILES LICENSE DESTINATION ${CMAKE_INSTALL_DATADIR}/licenses/croner)
endif()
