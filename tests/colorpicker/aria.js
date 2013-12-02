(function() {
    module("Color tools", {
        setup: function() {
            cp = $("<div>").kendoColorPalette().data("kendoColorPalette");
        },
        teardown: function() {
            cp.destroy();
        }
    });

    test("Simple color selector renders aria-label for each color", function(){
        cp.element.find(".k-item").each(function(){
            var label = $(this).attr("aria-label");
            ok(label, "aria-label defined on cells"); // label defined
            var bg = $(this);
            var color = kendo.parseColor(label);
            bg = kendo.parseColor(bg.css("background-color"));
            ok(color && bg && color.equals(bg), "aria-label is same as background color");
        });
    });

    test("Simple color selector maintains aria-selected attribute consistent with selection", function(){
        var items = cp.element.find(".k-item");
        for (var i = 0; i < 5; ++i) {
            var index = Math.floor(items.length * Math.random());
            var cell = $(items[index]);
            cell.click();
            var a = cp.element.find("[aria-selected]");
            ok(a.length == 1 && a[0] === cell[0]);
        }
    });
})();
