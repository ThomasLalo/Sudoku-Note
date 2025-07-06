<div class="display-container">
    <div class="isometric-container">
        <div class="box bg-background-lightest"> </div>
        <div class="right-parallelogram bg-accent-light"></div>
        <div class="bottom-parallelogram bg-accent-dark"></div>
    </div>
</div>


<style>
    .display-container {
        display: flex;
        height: 90vmin;
        align-items: center;
        justify-content: center;
    }

    .isometric-container {
        position: relative;
        height: calc( var(--box-height) + var(--diagonal-length) );
        width: calc( var(--box-width) + var(--diagonal-length) );
        --box-width: 9vmin;
        --box-height: 3vmin;
        --diagonal-length: 1vmin;
    }

    .box {
        position: absolute;
        height: var(--box-height);
        width: var(--box-width);
        top: 0;
        left: 0;
    }

    .right-parallelogram {
        position: absolute;
        width: var(--diagonal-length);
        height: var(--box-height);
        transform: skew(0,45deg);
        transform-origin: left top;
        left: var(--box-width);
    }

    .bottom-parallelogram {
        position: absolute;
        width: var(--box-width);
        height: var(--diagonal-length);
        transform: skew(45deg);
        transform-origin: left top;
        top: var(--box-height);
    }
</style>