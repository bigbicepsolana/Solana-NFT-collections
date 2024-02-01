const { program } = require("commander");
const fs = require("fs");
const path = require("path");
const dayjs = require("dayjs");

program
  .command("snapshot <project_name> <collection_address> [RPC]")
  .description("Take a snapshot of a project")
  .action(async (project_name, collection_address, RPC) => {
    RPC = RPC || "https://api.mainnet-beta.solana.com";
    const getAssetsByGroup = async () => {
      console.time("getAssetsByGroup"); // Start the timer
      let page = 1;
      let assetList = [];

      while (page) {
        const response = await fetch(RPC, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: "my-id",
            method: "getAssetsByGroup",
            params: {
              groupKey: "collection",
              groupValue: collection_address,
              page: page,
              limit: 1000,
            },
          }),
        });
        const { result } = await response.json();

        assetList.push(...result.items);
        if (result.total !== 1000) {
          page = false;
        } else {
          page++;
        }
      }

      const resultData = {
        totalResults: assetList.length,
        results: assetList,
      };
      const dirPath = path.join(__dirname, `../NFTs/${project_name}`);
      const dateStamp = dayjs().format("YYYYMMDD"); // Generate a datestamp
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      // Generate CSV content
      const csvContent = resultData.results
        .map((item) => `${item.ownership.owner},${item.id}`)
        .join("\n");
      fs.writeFileSync(
        `${dirPath}/${project_name}_${dateStamp}.csv`, // Dynamic path based on dirPath and dateStamp
        `owner,nftmint\n${csvContent}`
      );

      // Generate JSON content
      const jsonContent = resultData.results.map((item) => ({
        NFTAddress: item.id,
        ownerAddress: item.ownership.owner,
      }));
      fs.writeFileSync(
        `${dirPath}/${project_name}_${dateStamp}.json`, // Dynamic path based on dirPath and dateStamp
        JSON.stringify(jsonContent, null, 2)
      );

      // Generate Hashlist JSON
      const hashlistContent = resultData.results.map((item) => item.id);
      fs.writeFileSync(
        `${dirPath}/${project_name}_hashlist_${dateStamp}.json`, // Dynamic path based on dirPath and dateStamp
        JSON.stringify(hashlistContent, null, 2)
      );

      // Generate Unique Owners CSV
      const uniqueOwners = [
        ...new Set(resultData.results.map((item) => item.ownership.owner)),
      ];
      const uniqueOwnersCSV = uniqueOwners.join("\n");
      fs.writeFileSync(
        `${dirPath}/unique_${project_name}_owners_${dateStamp}.csv`, // Dynamic path based on dirPath and dateStamp
        `owner\n${uniqueOwnersCSV}`
      );

      console.log("Files generated successfully.");
      console.log(`${project_name} Assets:`, resultData);
      console.timeEnd("getAssetsByGroup");
    };
    await getAssetsByGroup();
  });

program.parse(process.argv);