async function main() {
  console.log("[seed] no hay datos precargados; la base existente no fue modificada.");
}

main()
  .catch(async (e) => {
    console.error(e);
    process.exit(1);
  });
