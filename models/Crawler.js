"use strict";

const { Builder, By, Key, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const fs = require("fs");

class Crawler {
  constructor(resultFileName) {
    this.contents = { fname: [], text: [] };
    this.saveFileName = resultFileName;
  }

  async run() {
    // headless로 크롬 드라이버 실행
    let driver = await new Builder()
      .forBrowser("chrome")
      .setChromeOptions(
        new chrome.Options()
          .headless()
          .addArguments("--disable-gpu", "window-size=1920x1080", "lang=ko_KR")
      )
      .build();

    try {
      // 특정 URL 생성
      await driver.get(process.env.URL_TARGET);
      let userAgent = await driver.executeScript("return navigator.userAgent;");
      console.log("[UserAgent]", userAgent);

      // css selector로 가져온 element가 위치할때까지 최대 20초간 기다린다.
      await driver.wait(
        until.elementLocated(
          By.className("w2group pos_relative ofh isCollapsed")
        ),
        20000
      );

      // 다 클릭해서 열어준다. (collapsed 상태에서는 text가 읽어지지 않음)
      let titleButtons = await driver.findElements(
        By.className("w2textbox fl com_example_left_menu_category_depth1")
      );

      let idx = 0;
      for (let button of titleButtons) {
        // 첫번째 메뉴는 열려있기 때문에 클릭해서 열지 않고, 닫혀 있는 나머지 메뉴들만 클릭해서 열어준다.
        if (idx != 0) {
          await button.click();
        }
        idx++;
      }

      // 클릭하면 페이지로 이동하는 anchor 요소들
      let childAnchorElement = await driver.findElements(
        By.className("w2anchor2 com_example_left_menu_lbl")
      );

      // contents classname = w2wframe com_example_descBox example_viewer
      // 검색한 elements 하위의 value를 출력함
      console.log("[resultElements.length]", childAnchorElement.length);
      for (var i = 0; i < childAnchorElement.length; i++) {
        let title = await childAnchorElement[i].getText();
        console.log("- " + title);
        try {
          await childAnchorElement[i].click();
          // css selector로 가져온 element가 위치할때까지 최대 20초간 기다린다.
          await driver.wait(
            until.elementLocated(
              By.className(
                "w2wframe w2tabContainer_contents w2tabcontrol_contents_wrapper w2tabcontrol_contents_wrapper_selected"
              )
            ),
            20000
          );

          let activeTabContainer = await driver.findElements(
            By.className(
              "w2wframe w2tabContainer_contents w2tabcontrol_contents_wrapper w2tabcontrol_contents_wrapper_selected"
            )
          );

          // 탭 클릭
          let sourceTabButton = await driver.findElement(
            By.linkText("Original Source")
          );
          await sourceTabButton.click();

          await driver.wait(
            until.elementLocated(By.className("w2tabcontrol_contents")),
            5000
          );

          let codeContainers = await driver.findElements(
            By.className("w2tabcontrol_contents")
          );

          let codeStrTmp = "";
          for (let j = 0; j < codeContainers.length; j++) {
            let attr = await codeContainers[j].getAttribute("aria-labelledby");
            if (attr == "Original Source") {
              let holeTxt = await codeContainers[j].getText();
              codeStrTmp += holeTxt.replace("Original Source\n", "");
              break;
            }
          }

          let descStrTmp = "";

          for (var j = 0; j < activeTabContainer.length; j++) {
            descStrTmp += await activeTabContainer[j].getText();
          }

          this.contents["fname"].push(title);
          this.contents["text"].push(descStrTmp);
          this.contents["code"].push(codeStrTmp);
        } catch {
          continue;
        }
      }

      console.log(this.contents);
      // let resultStr = JSON.stringify(contents, this.replacer);

      // TODO 저장 실패에 따른 로직 필요?
      let resultStr = JSON.stringify(this.contents);
      fs.writeFileSync(this.saveFileName, resultStr, (err) => {
        if (err) return false;
        else return true;
      });

      return this.contents;
    } catch (e) {
      console.log(e);
    } finally {
      driver.quit();
    }
  }

  getData() {
    return this.contents;
  }

  // map to stirng
  replacer(key, value) {
    if (value instanceof Map) {
      //형식 확인
      return {
        dataType: "Map", //정의
        value: Array.from(value.entries()), //entries 함수를 통해 배열로 변경(이중)
      };
    } else {
      return value;
    }
  }

  sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}

module.exports = Crawler;
