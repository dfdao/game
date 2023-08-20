<div class="Container">
  <div class="ImgContainer">
    <img src="/round_art/round5.jpg" alt="Art by @JannehMoe" />
    <span class="Smaller">
      <span class="Text">Art by</span>
      <a class="TwitterLink" href="https://twitter.com/JannehMoe">@JannehMoe</a>
    </span>
  </div>
</div>

<style>
  .Container {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .Smaller {
    font-size: 80%;
  }

  .Text {
    color: var(--df-colors-text);
  }

  .TwitterLink {
    text-decoration: underline;
    color: var(--df-colors-dfblue);
  }
  .TwitterLink:hover {
    /* TODO: Figure out dynamic lighten by 30% */
    color: rgb(37, 205, 255);
  }

  .ImgContainer {
    display: inline-block;
    text-align: right;
    width: 750px;
    max-width: 80vw;
  }

  @media only screen and (max-device-width: 1000px) {
    .ImgContainer {
      width: 100%;
      max-width: 100%;
      padding: 8px;
      font-size: 80%;
    }
  }
</style>
