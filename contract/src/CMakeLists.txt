project(ttt)

set(EOSIO_WASM_OLD_BEHAVIOR "Off")
find_package(eosio.cdt)

add_contract( ttt_contract ttt_contract ttt.cpp )
target_include_directories( ttt_contract PUBLIC ${CMAKE_SOURCE_DIR}/../include )
target_ricardian_directory( ttt_contract ${CMAKE_SOURCE_DIR}/../ricardian )