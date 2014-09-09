(function(f, define){
    define([ "./kendo.dom", "./kendo.data" ], f);
})(function(){

var __meta__ = {
    id: "treelist",
    name: "TreeList",
    category: "web",
    description: "",
    depends: [ "dom", "data" ]
};

(function($, undefined) {
    var data = kendo.data;
    var extend = $.extend;
    var kendoDom = kendo.dom;
    var kendoDomElement = kendoDom.element;
    var kendoTextElement = kendoDom.text;
    var ui = kendo.ui;
    var Widget = ui.Widget;
    var HierarchicalDataSource = data.HierarchicalDataSource;
    var proxy = $.proxy;
    var map = $.map;
    var CHANGE = "change";
    var DOT = ".";
    var NS = ".kendoGanttList";
    var CLICK = "click";

    var listStyles = {
        wrapper: "k-treelist k-grid k-widget",
        header: "k-header",
        alt: "k-alt",
        editCell: "k-edit-cell",
        group: "k-treelist-group",
        gridHeader: "k-grid-header",
        gridHeaderWrap: "k-grid-header-wrap",
        gridContent: "k-grid-content",
        gridContentWrap: "k-grid-content",
        selected: "k-state-selected",
        icon: "k-icon",
        iconCollapse: "k-i-collapse",
        iconExpand: "k-i-expand",
        iconHidden: "k-i-none",
        iconPlaceHolder: "k-icon k-i-none",
        input: "k-input",
        dropPositions: "k-insert-top k-insert-bottom k-add k-insert-middle",
        dropTop: "k-insert-top",
        dropBottom: "k-insert-bottom",
        dropAdd: "k-add",
        dropMiddle: "k-insert-middle",
        dropDenied: "k-denied",
        dragStatus: "k-drag-status",
        dragClue: "k-drag-clue",
        dragClueText: "k-clue-text"
    };

    var TreeListDataSource = HierarchicalDataSource.extend({
        init: function(options) {
            var children = kendo.getter("schema.model.children", true)(options || {});
            if (children) {
                throw new Error("TreeListDataSource can only be bound to homogeneous data.");
            }

            HierarchicalDataSource.fn.init.call(this, options);
        }
    });

    function createPlaceholders(options) {
        var spans = [];
        var className = options.className;

        for (var i = 0, level = options.level; i < level; i++) {
            spans.push(kendoDomElement("span", { className: className }));
        }

        return spans;
    }

    var TreeList = Widget.extend({
        init: function(element, options) {
            Widget.fn.init.call(this, element, options);

            this._dataSource();
            this._columns();
            this._layout();
            this._domTrees();
            this._header();
            this._sortable();
            this._selectable();
            this._attachEvents();

            this._adjustHeight();

            if (this.options.autoBind) {
                this.dataSource.fetch();
            }

            kendo.notify(this);
        },

        _dataSource: function() {
            var dataSource = this.options.dataSource;

            if (this.dataSource && this._refreshHandler) {
                this.dataSource.unbind(CHANGE, this._refreshHandler);
            } else {
                this._refreshHandler = proxy(this.refresh, this);
            }

            //TODO Implement TreeListDataSource.create and refactor this code!!!
            if (dataSource instanceof TreeListDataSource) {
                this.dataSource = dataSource;
            } else {
                this.dataSource = new TreeListDataSource(dataSource);
            }

            this.dataSource.bind(CHANGE, this._refreshHandler);
        },

        refresh: function(e) {
            var dataSource = this.dataSource;

            console.log("refresh", e, e.node);
            this._render(dataSource.view());
        },

        _adjustHeight: function() {
            //this.content.height(this.element.height() - this.header.parent().outerHeight());
        },

        destroy: function() {
            Widget.fn.destroy.call(this);

            this.dataSource.unbind(CHANGE, this._refreshHandler);

            if (this.touch) {
                this.touch.destroy();
            }

            this.content.off(NS);
            this.header = null;
            this.content = null;
            this.levels = null;

            kendo.destroy(this.element);
        },

        options: {
            name: "TreeList",
            autoBind: true,
            selectable: true
        },

        _attachEvents: function() {
            var that = this;

            that.content
                .on(CLICK + NS, "td > span." + listStyles.icon + ":not(." + listStyles.iconHidden + ")", function(e) {
                    var element = $(this);
                    var model = that._modelFromElement(element);

                    model.set("expanded", !model.get("expanded"));

                    e.stopPropagation();
                });
        },

        _domTrees: function() {
            this.headerTree = new kendoDom.Tree(this.header[0]);
            this.contentTree = new kendoDom.Tree(this.content[0]);
        },

        _columns: function() {
            var columns = this.options.columns || [];
            var column;
            var model = function() {
                this.field = "";
                this.title = "";
                this.editable = false;
                this.sortable = false;
            };

            this.columns = map(columns, function(column) {
                column = typeof column === "string" ? {
                    field: column, title: column
                } : column;

                return extend(new model(), column);
            });
        },

        _layout: function () {
            var element = this.element;

            element
                .addClass(listStyles.wrapper)
                .append("<div class='" + listStyles.gridHeader + "'><div class='" + listStyles.gridHeaderWrap + "'></div></div>")
                .append("<div class='" + listStyles.gridContentWrap + "'></div>");

            this.header = element.find(DOT + listStyles.gridHeaderWrap);
            this.content = element.find(DOT + listStyles.gridContent);
        },

        _header: function() {
            var domTree = this.headerTree;
            var colgroup;
            var thead;
            var table;

            colgroup = kendoDomElement("colgroup", null, this._cols());
            thead = kendoDomElement("thead", { "role": "rowgroup" }, [kendoDomElement("tr", { "role": "row" }, this._ths())]);
            table = kendoDomElement("table", {
                "style": { "min-width": this.options.listWidth + "px" },
                "role": "grid"
            }, [colgroup, thead]);

            domTree.render([table]);
        },

        _render: function(tasks) {
            var colgroup;
            var tbody;
            var table;

            this.levels = [{ field: null, value: 0 }];

            colgroup = kendoDomElement("colgroup", null, this._cols());
            tbody = kendoDomElement("tbody", { "role": "rowgroup" }, this._trs(tasks));
            table = kendoDomElement("table", {
                "style": { "min-width": this.options.listWidth + "px" },
                "tabIndex": 0,
                "role": "treegrid"
            }, [colgroup, tbody]);

            this.contentTree.render([table]);
            this.trigger("render");
        },

        _ths: function() {
            var columns = this.columns;
            var column;
            var attr;
            var ths = [];

            for (var i = 0, length = columns.length; i < length; i++) {
                column = columns[i];
                attr = {
                    "data-field": column.field,
                    "data-title": column.title, className: listStyles.header,
                    "role": "columnheader"
                };

                ths.push(kendoDomElement("th", attr, [kendoTextElement(column.title)]));
            }

            return ths;
        },

        _cols: function() {
            var columns = this.columns;
            var column;
            var style;
            var width;
            var cols = [];

            for (var i = 0, length = columns.length; i < length; i++) {
                column = columns[i];
                width = column.width;

                if (width && parseInt(width, 10) !== 0) {
                    style = { style: { width: typeof width === STRING ? width : width + "px" } };
                } else {
                    style = null;
                }

                cols.push(kendoDomElement("col", style, []));
            }

            return cols;
        },

        _trs: function(tasks) {
            var task;
            var rows = [];
            var attr;
            var className = [];
            var level;

            for (var i = 0, length = tasks.length; i < length; i++) {
                task = tasks[i];

                level = task.level();

                attr = {
                    "data-uid": task.uid,
                    "data-level": level,
                    "role": "row"
                };

                if (task.hasChildren) {
                    attr["aria-expanded"] = task.expanded;
                }

                if (i % 2 !== 0) {
                    className.push(listStyles.alt);
                }

                if (task.hasChildren) {
                    className.push(listStyles.group);
                }

                if (className.length) {
                    attr.className = className.join(" ");
                }

                rows.push(this._tds({
                    task: task,
                    attr: attr,
                    level: level
                }));

                className = [];
            }

            return rows;
        },

        _tds: function(options) {
            var children = [];
            var columns = this.columns;
            var column;

            for (var i = 0, l = columns.length; i < l; i++) {
                column = columns[i];

                children.push(this._td({ task: options.task, column: column, level: options.level }));
            }

            return kendoDomElement("tr", options.attr, children);
        },

        _td: function(options) {
            var children = [];
            var task = options.task;
            var column = options.column;
            var value = task.get(column.field);
            var formatedValue = column.format ? kendo.format(column.format, value) : value;

            //if (column.field === "title") {
                children = createPlaceholders({ level: options.level, className: listStyles.iconPlaceHolder });
                children.push(kendoDomElement("span", {
                    className: listStyles.icon + " " + (task.hasChildren ? (task.expanded ? listStyles.iconCollapse : listStyles.iconExpand)
                        : listStyles.iconHidden)
                }));
            //}

            children.push(kendoDomElement("span", null, [kendoTextElement(formatedValue)]));

            return kendoDomElement("td", { "role": "gridcell" }, children);
        },

        _levels: function(options) {
            var levels = this.levels;
            var level;
            var hasChildren = options.hasChildren;
            var idx = options.idx;
            var id = options.id;

            for (var i = 0, length = levels.length; i < length; i++) {
                level = levels[i];

                if (level.field == idx) {

                    if (hasChildren) {
                        levels.push({ field: id, value: level.value + 1 });
                    }

                    return level.value;
                }
            }
        },

        _sortable: function() {
            var columns = this.columns;
            var column;
            var sortableInstance;
            var cells = this.header.find("th");
            var cell;

            for (var idx = 0, length = cells.length; idx < length; idx++) {
                column = columns[idx];

                if (column.sortable) {
                    cell = cells.eq(idx);

                    sortableInstance = cell.data("kendoColumnSorter");

                    if (sortableInstance) {
                        sortableInstance.destroy();
                    }

                    cell.attr("data-" + kendo.ns + "field", column.field)
                        .kendoColumnSorter({ dataSource: this.dataSource });
                }
            }
            cells = null;
        },

        _selectable: function() {
            var that = this;
            var selectable = this.options.selectable;

            if (selectable) {
                this.content
                   .on(CLICK + NS, "tr", function(e) {
                       var element = $(this);

                       if (!e.ctrlKey) {
                           that.select(element);
                       } else {
                           that.clearSelection();
                       }
                   });
            }
        },

        select: function(value) {
            var element = this.content.find(value);
            var selectedClassName = listStyles.selected;

            if (element.length) {
                element
                    .siblings(DOT + selectedClassName)
                    .removeClass(selectedClassName)
                    .attr("aria-selected", false)
                    .end()
                    .addClass(selectedClassName)
                    .attr("aria-selected", true);

                this.trigger("change");

                return;
            }

            return this.content.find(DOT + selectedClassName);
        },

        clearSelection: function() {
            var selected = this.select();

            if (selected.length) {
                selected.removeClass(listStyles.selected);

                this.trigger("change");
            }
        },

        _setDataSource: function(dataSource) {
            this.dataSource = dataSource;
        },

        _modelFromElement: function(element) {
            var row = element.closest("tr");
            var model = this.dataSource.getByUid(row.attr(kendo.attr("uid")));

            return model;
        }
    });

    extend(true, kendo.data, {
        TreeListDataSource: TreeListDataSource
    });

    extend(true, kendo.ui, {
        TreeList: TreeList
    });

    ui.plugin(TreeList);

})(window.kendo.jQuery);

return window.kendo;

}, typeof define == 'function' && define.amd ? define : function(_, f){ f(); });
