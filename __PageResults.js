class PageResults {


    /*
  * Assemble Statements table
  * @param {object} context: {state: state, report: report, log: log, table: table, pageContext: pageContext, suppressSettings: suppressSettings}
  * @param {string} bannerId: explicit bannerId to use, not mandotary
  */

    static function tableStatements_Render(context, bannerId) {

        var state = context.state;
        var table = context.table;
        var log = context.log;
        var suppressSettings = context.suppressSettings;

        tableStatements_AddColumns(context, bannerId);
        tableStatements_AddRows(context);
        tableStatements_ApplyConditionalFormatting(context);
        SuppressUtil.setTableSuppress(table, suppressSettings);

        table.Decimals = 0;
        table.RowNesting = TableRowNestingType.Nesting;
        table.RemoveEmptyHeaders.Rows = true;
        table.Caching.Enabled = false;

    }

    /*
  * Hide Statements table because of suppress
  * @param {object} context: {state: state, report: report, log: log, table: table}
  */

    static function tableStatements_Hide(context) {

        return SuppressUtil.isGloballyHidden(context);
    }


    /*
  * Column Banner selector for Statements table
  * @param {object} context: {state: state, report: report, log: log, table: table}
  * @param {string} bannerId: explicit bannerId to use, not mandotary
  */

    static function tableStatements_AddColumns(context, bannerId) {

        var log = context.log;
        var pageId = PageUtil.getCurrentPageIdInConfig(context);

        tableStatements_AddColumns_Banner0(context); // default set
        return;

    }

    /*
  * Add set of rows based on questions or categorizations (for pulse)
  * @param {object} context: {state: state, report: report, log: log, table: table}
  */

    static function tableStatements_AddRows(context) {

        var log = context.log;
        var pageId = PageUtil.getCurrentPageIdInConfig(context);
        var resultStatements = DataSourceUtil.getPagePropertyValueFromConfig(context, pageId, 'ResultStatements');
        var dimensions = DataSourceUtil.getPagePropertyValueFromConfig(context, pageId, 'Dimensions');

        if(resultStatements && resultStatements.length>0 && dimensions && dimensions.length>0) {
            throw new Error('PageResults.tableStatements_AddRows: One of Config properties for page "Results" ResultStatements and Dimensions should be null or [].');
        }

        if(resultStatements && resultStatements.length>0) {
            tableStatements_AddRows_Banner0(context);
            return;
        }

        if(dimensions && dimensions.length>0) {
            tableStatements_AddRows_Banner1(context);
            return;
        }

        throw new Error('PageResults.tableStatements_AddRows: No data to build rows. Please check ResultStatements and Dimensions properties for page Results.');
    }

    /*
  * Add statement questions as table rows based on Survey Config-> Page_Result-> ResultStatements
  *  @param {object} context: {state: state, report: report, log: log, table: table}
  */

    static function tableStatements_AddRows_Banner0(context) {

        var state = context.state;
        var table = context.table;
        var log = context.log;
        var questions = DataSourceUtil.getPagePropertyValueFromConfig(context, PageUtil.getCurrentPageIdInConfig(context), 'ResultStatements');

        for(var i=0; i<questions.length; i++) {
            var questionnaireElement : QuestionnaireElement = QuestionUtil.getQuestionnaireElement(context, questions[i]);
            var headerQuestion : HeaderQuestion = new HeaderQuestion(questionnaireElement);
            headerQuestion.IsCollapsed = true;
            TableUtil.maskOutNA(context, headerQuestion);
            TableUtil.addBreakByNestedHeader(context, headerQuestion);
            table.RowHeaders.Add(headerQuestion);
        }
    }


    /*
  * Add categorizations as table rows based on Survey Config-> Page_Result-> Dimensions property
  *  @param {object} context: {state: state, report: report, log: log, table: table}
  */

    static function tableStatements_AddRows_Banner1(context) {

        var report = context.report;
        var state = context.state;
        var table = context.table;
        var log = context.log;
        var pageId = PageUtil.getCurrentPageIdInConfig(context);

        var categorizations = getActiveCategorizations(context); //DataSourceUtil.getPagePropertyValueFromConfig(context, pageId, 'Dimensions');
        var isDimensionVisible = state.Parameters.GetString('p_Results_TableTabSwitcher')!=='noDims';

        for (var i=0; i<categorizations.length; i++) {

            var categorization : HeaderCategorization = new HeaderCategorization();
            categorization.CategorizationId = String(categorizations[i]).replace(/[ ,&]/g,'');
            categorization.DataSourceNodeId = DataSourceUtil.getDsId(context);
            categorization.DefaultStatistic = StatisticsType.Average;
            categorization.CalculationRule = CategorizationType.AverageOfAggregates; // AvgOfIndividual affects performance
            categorization.Preaggregation = PreaggregationType.Average;
            categorization.SampleRule = SampleEvaluationRule.Max;// https://jiraosl.firmglobal.com/browse/TQA-4116
            categorization.Collapsed = false;
            categorization.Totals = isDimensionVisible;

            TableUtil.addBreakByNestedHeader(context, categorization);
            table.RowHeaders.Add(categorization);
        }

        table.TotalsFirst = true;
    }

    /*
* Retuns active categorizations. For baby survey from pulse program it'll be limited list of categorizations.
*  @param {object} context: {state: state, report: report, log: log, table: table}
* @return {array} array of categorization ids
*/

    static function getActiveCategorizations(context) {

        var log = context.log;
        var pageId = PageUtil.getCurrentPageIdInConfig(context);

        var schemaId = DataSourceUtil.getSurveyPropertyValueFromConfig(context, 'DimensionsForSurveysSchemaId');
        var tableName = DataSourceUtil.getSurveyPropertyValueFromConfig(context, 'DimensionsForSurveysTable');

        if(schemaId && tableName) { // there is storage for baby survey dimensions

            var confirmit = context.confirmit;
            var schema: DBDesignerSchema = confirmit.GetDBDesignerSchema(schemaId);
            var table: DBDesignerTable = schema.GetDBDesignerTable(tableName);
            var selectedProject = ParamUtil.GetSelectedCodes(context, 'p_projectSelector');
            var dimensions = table.GetColumnValues('__l9','id', selectedProject[0]);

            if(dimensions && dimensions.Count>0) {
                return dimensions[0].split(',');
            }
        }

        return DataSourceUtil.getPagePropertyValueFromConfig(context, pageId, 'Dimensions');
    }


    /*
  * Add set of columns: Score, distribution barChart, Scale Distribution, Responses, Benchmarks, Benchmark comparison bar chart, hierarchy comparison columns
  * @param {object} context: {state: state, report: report, log: log, table: table}
  * @param {string} scoreType
  */

    static function tableStatements_AddColumns_Banner0(context) {

        var log = context.log;

        // add Score column
        addScore(context);
        //add distribution barChart
        addDistributionBarChart(context);
        // add scale distribution
        addScaleDistributionColumns(context);
        // add Responses Column
        addResponsesColumn(context);
        // add Benchmark related columns
        tableStatements_AddBenchmarkColumns_Banner0(context);
    }

    /*
  * Add Score calculation
  * @param {object} context: {state: state, report: report, log: log, table: table}
  * @param {string} scoreType: 'avg', '%fav', '%fav-%unfav'
  * @param {Header} parentHeader - not mandotary
  * @param {Array} [Header1, Header2,...]
  */
    static function addScore(context, parentHeader) {

        var table = context.table;
        var pageId = PageUtil.getCurrentPageIdInConfig(context);
        var scoreType = DataSourceUtil.getPagePropertyValueFromConfig(context, pageId, 'ScoreType');

        scoreType = scoreType.toLowerCase();

        if(scoreType === 'avg')	{

            // add Score column
            var avg: HeaderFormula = new HeaderFormula();
            avg.Type = FormulaType.Expression;
            avg.Expression = 'cellv(col+1, row)';
            avg.Decimals = 0;
            avg.Title = TextAndParameterUtil.getLabelByKey(context, 'Score');

            var score: HeaderStatistics = new HeaderStatistics();
            score.Decimals = 0;
            score.Statistics.Avg = true;
            score.HideData = true;
            //score.Texts.Average = TextAndParameterUtil.getLabelByKey(context, 'Score');

            if(parentHeader) {
                parentHeader.SubHeaders.Add(avg);
                parentHeader.SubHeaders.Add(score);
            } else {
                table.ColumnHeaders.Add(avg);
                table.ColumnHeaders.Add(score);
            }
            return [avg, score]; // TO DO: revise, this is cruntch to align avg with other types of scores which consits of 2 cols
        }

        var bcCategories: HeaderCategories = new HeaderCategories();

        if(scoreType === '%fav') {

            // add Score column
            var posScoreRecodingCols = DataSourceUtil.getSurveyPropertyValueFromConfig(context, 'ReusableRecoding_PositiveCols');
            var fav: HeaderFormula = new HeaderFormula();
            fav.Type = FormulaType.Expression;
            fav.Expression = 'cellv(col+'+posScoreRecodingCols.join(', row)+cellv(col+')+',row)';
            fav.Decimals = 0;
            fav.Title = TextAndParameterUtil.getLabelByKey(context, 'Fav');

            //add distribution barChart
            bcCategories.RecodingIdent = DataSourceUtil.getSurveyPropertyValueFromConfig(context, 'ReusableRecodingId');
            bcCategories.Totals = false;
            bcCategories.Distributions.Enabled = true;
            bcCategories.Distributions.HorizontalPercents = true;
            bcCategories.Decimals = 0;
            bcCategories.HideData = true;

            if(parentHeader) {
                parentHeader.SubHeaders.Add(fav);
                parentHeader.SubHeaders.Add(bcCategories);
            } else {
                table.ColumnHeaders.Add(fav);
                table.ColumnHeaders.Add(bcCategories);
            }
            return [fav, bcCategories];
        }

        if(scoreType === '%fav-%unfav') {

            // add Score column
            var posScoreRecodingCols = DataSourceUtil.getSurveyPropertyValueFromConfig(context, 'ReusableRecoding_PositiveCols');
            var negScoreRecodingCols = DataSourceUtil.getSurveyPropertyValueFromConfig(context, 'ReusableRecoding_NegativeCols');
            var diff: HeaderFormula = new HeaderFormula();
            diff.Type = FormulaType.Expression;
            diff.Expression = 'cellv(col+'+posScoreRecodingCols.join(', row)+cellv(col+')+',row) - cellv(col+'+negScoreRecodingCols.join(', row)-cellv(col+')+',row)';
            diff.Decimals = 0;
            diff.Title = TextAndParameterUtil.getLabelByKey(context, 'FavMinUnfav');

            //add distribution barChart
            bcCategories.RecodingIdent = DataSourceUtil.getSurveyPropertyValueFromConfig(context, 'ReusableRecodingId');
            bcCategories.Totals = false;
            bcCategories.Distributions.Enabled = true;
            bcCategories.Distributions.HorizontalPercents = true;
            bcCategories.Decimals = 0;
            bcCategories.HideData = true;

            if(parentHeader) {
                parentHeader.SubHeaders.Add(diff);
                parentHeader.SubHeaders.Add(bcCategories);
            } else {
                table.ColumnHeaders.Add(diff);
                table.ColumnHeaders.Add(bcCategories);
            }
            return [diff, bcCategories];
        }

        throw new Error('PageResults.addScore: Calculation of score for type "'+scoreType+' is not found."');
    }

    /*
  *  add distribution bar chart
  *  @param {object} context: {state: state, report: report, log: log, table: table}
  */
    static function addDistributionBarChart(context) {

        var table = context.table;
        var state = context.state;

        //add distribution barChart
        var bcCategories: HeaderCategories = new HeaderCategories();
        bcCategories.RecodingIdent = DataSourceUtil.getSurveyPropertyValueFromConfig(context, 'ReusableRecodingId');
        bcCategories.Totals = false;
        bcCategories.Distributions.Enabled = true;
        bcCategories.Distributions.HorizontalPercents = true;
        bcCategories.Decimals = 0;
        bcCategories.HideData = false;
        table.ColumnHeaders.Add(bcCategories);

        if(state.ReportExecutionMode !== ReportExecutionMode.ExcelExport) {

            var barChart: HeaderChartCombo = new HeaderChartCombo();
            var chartValues = [];
            var barChartColors = Config.barChartColors_Distribution;
            var i;

            bcCategories.HideData = true;

            for(i=0; i< barChartColors.length; i++) {
                var chartValue: ChartComboValue = new ChartComboValue();
                chartValue.Expression = 'cellv(col-'+(i+1)+', row)';
                chartValue.BaseColor = new ChartComboColorSet([barChartColors[i].color]);
                chartValue.Name = TextAndParameterUtil.getTextTranslationByKey(context, barChartColors[i].label);
                chartValue.CssClass = 'barchart__bar barchart__bar_type_distribution '+ barChartColors[i].type;
                chartValues.push(chartValue);
            }

            barChart.Values = chartValues;
            barChart.TypeOfChart = ChartComboType.Bar100;
            barChart.Title = TextAndParameterUtil.getLabelByKey(context, 'Distribution');
            table.ColumnHeaders.Add(barChart);
        }
    }

    /*
     *  add scale distribution columns
     *  @param {object} context: {state: state, report: report, log: log, table: table}
     */
    static function addScaleDistributionColumns(context) {

        var state = context.state;
        var table = context.table;

        // add scale distribution
        if(!state.Parameters.IsNull('p_Results_CountsPercents')) {

            var selectedDistr = state.Parameters.GetString('p_Results_CountsPercents');
            var categoryDistr: HeaderCategories = new HeaderCategories();
            var baseDist: HeaderBase = new HeaderBase();

            categoryDistr.Totals = false;
            baseDist.Distributions.Enabled = true;
            baseDist.Decimals = 0;
            baseDist.HideHeader = true;

            if(selectedDistr==='C') { // Counts

                baseDist.Distributions.Count = true;
                baseDist.Distributions.HorizontalPercents = false;
            } else { // Percent

                baseDist.Distributions.HorizontalPercents = true;
                baseDist.Distributions.Count = false;
            }

            TableUtil.maskOutNA(context, categoryDistr);

            categoryDistr.SubHeaders.Add(baseDist);
            table.ColumnHeaders.Add(categoryDistr);
        }
    }

    /*
    *  add base column
    *  @param {object} context: {state: state, report: report, log: log, table: table}
    */
    static function addResponsesColumn(context) {

        var table = context.table;

        // add Responses Column
        var responses: HeaderBase = new HeaderBase();
        var catForNAMask: HeaderCategories = new HeaderCategories(); // a way to exclude NA from base calculation

        TableUtil.maskOutNA(context, catForNAMask); // exclude NA code
        catForNAMask.HideHeader = true;
        catForNAMask.Mask.Type = MaskType.ShowCodes;
        catForNAMask.Mask.Codes = ''; // do not show any codes but Total
        responses.SubHeaders.Add(catForNAMask);

        table.ColumnHeaders.Add(responses);
    }


    /*
  * Add set of benchmark related set of columns: Benchmarks, Benchmark comparison bar chart
  * @param {object} context: {state: state, report: report, log: log, table: table}
  */

    static function tableStatements_AddBenchmarkColumns_Banner0 (context) {


        var log = context.log;

        log.LogDebug('PageResults.tableStatements_AddBenchmarkColumns_Banner0 starting....: ' + DateTime.Now);

        if(!isBenchmarkAvailable(context)) {
            return;
        }

        
        var report = context.report;
        var state = context.state;
        var table = context.table;
        var pageId = PageUtil.getCurrentPageIdInConfig(context);
        var bmColumn = 2; // 1st coulumn always exists - it's base
        var baseValues: Datapoint[] = report.TableUtils.GetColumnValues('Benchmarks',1);
        log.LogDebug('PageResults.tableStatements_AddBenchmarkColumns_Banner0 after get column values of benchmarks: ' + DateTime.Now);
        var suppressValue = Config.SuppressSettings.TableSuppressValue;
        var benchmarkTableLabels = report.TableUtils.GetColumnHeaderCategoryTitles('Benchmarks');
        log.LogDebug('PageResults.tableStatements_AddBenchmarkColumns_Banner0 after get categories titles of benchmarks: ' + DateTime.Now);
        var base: Datapoint;

        // !!!order of how bm cols are added must comply with bm table column order!!!

        // previous wave benchmark
        var prevWave = getPreviousWave(context);
        if(prevWave) {
            // add values
            var waveHeader: HeaderContent = new HeaderContent();
            var preWaveVals: Datapoint[] = report.TableUtils.GetColumnValues('Benchmarks', bmColumn);

            waveHeader.HideData = true;

            for(var j=0; j<preWaveVals.length; j++) {

                var prevWaveVal: Datapoint = preWaveVals[j];
                base = baseValues[j];

                if (base.Value >= suppressValue && !prevWaveVal.IsEmpty) {
                    waveHeader.SetCellValue(j, prevWaveVal.Value);
                } else if (base.Value >= suppressValue) {
                    waveHeader.SetCellValue(j, '-');
                }
            }

            table.ColumnHeaders.Add(waveHeader);
            addScoreVsBenchmarkChart(context, 'col-1', 'ScoreVsPrevWave');
            bmColumn+=1;
        }

        // add benchmark data based on benchmark project
        if(DataSourceUtil.getPagePropertyValueFromConfig(context, pageId, 'BenchmarkProject')) {

            var benchmarkContent: HeaderContent = new HeaderContent();
            var benchmarkValues: Datapoint[] = report.TableUtils.GetColumnValues('Benchmarks',bmColumn);

            for(var i=0; i<benchmarkValues.length; i++) {

                var benchmark: Datapoint = benchmarkValues[i];
                base = baseValues[i];

                if (base.Value >= suppressValue && !benchmark.IsEmpty) {
                    benchmarkContent.SetCellValue(i, benchmark.Value);
                }
            }

            benchmarkContent.HideData = true;
            table.ColumnHeaders.Add(benchmarkContent);
            addScoreVsBenchmarkChart(context, 'col-1', 'ScoreVsNormValue');
            bmColumn+=1;
        }

        //add hierarchy comparison benchmarks
        var hierCompCols = DataSourceUtil.getPagePropertyValueFromConfig(context, pageId, 'HierarchyBasedComparisons');

        log.LogDebug('PageResults.tableStatements_AddBenchmarkColumns_Banner0 start cycle: ' + DateTime.Now);
        for(i=0; i<hierCompCols.length; i++) {

            var hierCompContent: HeaderContent = new HeaderContent();
            var hierValues: Datapoint[] = report.TableUtils.GetColumnValues('Benchmarks',bmColumn); // num of column where values are bmVolumn
            hierCompContent.Title = new Label(report.CurrentLanguage, benchmarkTableLabels[bmColumn-1]);

            for(var j=0; j<baseValues.length; j++) {

                base = baseValues[j];
                benchmark = hierValues[j];

                if (base.Value >= suppressValue && !benchmark.IsEmpty) {
                    hierCompContent.SetCellValue(j, benchmark.Value);
                }
            }

            table.ColumnHeaders.Add(hierCompContent);
            //addScoreVsBenchmarkChart(context, 'col-1', 'hierComp');
            bmColumn +=1;
        }
        log.LogDebug('PageResults.tableStatements_AddBenchmarkColumns_Banner0 end cycle: ' + DateTime.Now);
    }

    /**
     * create comparison barchart header: i.e. diff between current stat value and norm
     * @param {object} context: {state: state, report: report, log: log, table: table}
     * @param {string} expression - how to calc value
     * @param {string} labelKey - defines chart label
     */

    static function addScoreVsBenchmarkChart(context, normColPosition, labelKey) {

        var report = context.report;
        var state = context.state;
        var table = context.table;
        var barChart_ScoreVsNorm: HeaderChartCombo = new HeaderChartCombo();
        var chartValue_ScoreVsNorm = [];
        var barChart_ScoreVsNormColors = Config.barChartColors_NormVsScore;


        // add formula to calculate score vs. prev wave
        var formula_ScoreVsPrevNorm: HeaderFormula = new HeaderFormula();
        formula_ScoreVsPrevNorm.Type = FormulaType.Expression;
        formula_ScoreVsPrevNorm.Expression = 'if((cellv(1,row)-cellv('+normColPosition+',row) < 1 AND (cellv(1,row)-cellv('+normColPosition+',row) > -1)), 0, cellv(1,row)-cellv('+normColPosition+',row))'; // the 1st column in the table is score
        table.ColumnHeaders.Add(formula_ScoreVsPrevNorm);

        // add barchart
        if(state.ReportExecutionMode !== ReportExecutionMode.ExcelExport) {

            barChart_ScoreVsNorm.TypeOfChart = ChartComboType.Bar;
            barChart_ScoreVsNorm.Thickness = '100%';
            barChart_ScoreVsNorm.Size = 200;
            barChart_ScoreVsNorm.HideHeader = true;

            var chartValue_Main: ChartComboValue = new ChartComboValue();
            chartValue_Main.Expression = 'cellv(col-1,row)'; // diff between score and norm value, always previous column (formula)
            chartValue_Main.BaseColor = new ChartComboColorSet([barChart_ScoreVsNormColors[1].color]); // main color is red - negative
            chartValue_Main.CssClass = 'barchart__bar barchart__bar_type_score-vs-norm';

            var chartValue_Alternative: ChartComboColorAlternative = new ChartComboColorAlternative();
            chartValue_Alternative.Color = new ChartComboColorSet([barChart_ScoreVsNormColors[0].color]);
            chartValue_Alternative.Threshold = 0; // If greater than 0

            chartValue_Main.AltColors = [chartValue_Alternative];
            chartValue_ScoreVsNorm.push(chartValue_Main);

            barChart_ScoreVsNorm.Values = chartValue_ScoreVsNorm;
            barChart_ScoreVsNorm.Title = new Label(report.CurrentLanguage, TextAndParameterUtil.getTextTranslationByKey(context, labelKey));

            table.ColumnHeaders.Add(barChart_ScoreVsNorm);

        } else {
            formula_ScoreVsPrevNorm.Title = TextAndParameterUtil.getLabelByKey(context, labelKey);
        }

    }


    /*
  * Conditional Formatting for Statements table
  * @param {object} context: {state: state, report: report, log: log, table: table}
  */

    static function tableStatements_ApplyConditionalFormatting(context) {

        var table = context.table;
        var log = context.log;

        // Score column is bold and has bigger font-size
        var area: Area = new Area();
        var score: Condition = new Condition();
        score.Expression = 'col==1';
        score.Style = 'score-column cf-score-column';

        area.Name = 'Score';
        area.FromStart = true;
        area.Indexes = '1';
        area.RowFormatting = false;
        area.AddCondition(score);

        table.ConditionalFormatting.AddArea(area);

    }


    /*
  * show distribution bar chart legend
  * @param {object} context {state: state, report: report, log: log, text: text}
  */

    static function drawDistributionChartLegend(context) {

        var text = context.text;
        var barChartColors = Config.barChartColors_Distribution;
        var legend = '<div class="bar-chart-legend-container"><div class="bar-chart-legend">';

        for (var i=0; i < barChartColors.length; i++) {
            legend += '<div class="bar-chart-legend__item legend-item">'+
                '<div class="legend-item__color" style="background-color: '+barChartColors[i].color+';"></div>'+
                '<div class="legend-item__label">'+TextAndParameterUtil.getTextTranslationByKey(context, barChartColors[i].label)+'</div>'+
                '</div>';
        }

        legend += '</div></div>';
        text.Output.Append(legend);

        return;
    }

    //-----------------------------------------------------------------------------------------------

    /*
  * Assemble Benchmarks table
  * @param {object} context: {state: state, report: report, log: log, table: table}
  */

    static function tableBenchmarks_Render(context) {

        var state = context.state;
        var table = context.table;
        var log = context.log;
        var pageId = PageUtil.getCurrentPageIdInConfig(context);

        if(isBenchmarkAvailable(context)) {
            tableStatements_AddRows(context);
            tableBenchmarks_AddColumns_Banner0(context);

            table.Decimals = 0;
            table.RowNesting = TableRowNestingType.Nesting;
            table.RemoveEmptyHeaders.Rows = false;
        }
    }

    /*
  * Populate benchmarks table
  * @param {object} context: {state: state, report: report, log: log, table: table, user: user}
  */

    static function tableBenchmarks_AddColumns_Banner0(context) {

        var report = context.report;
        var state = context.state;
        var table = context.table;
        var log = context.log;
        var pageId = PageUtil.getCurrentPageIdInConfig(context);

        // add Responses Column
        var excludedFiltersForN: HeaderSegment = new HeaderSegment();
        var responses: HeaderBase = new HeaderBase();

        excludedFiltersForN.DataSourceNodeId = DataSourceUtil.getDsId(context);
        excludedFiltersForN.SegmentType = HeaderSegmentType.Expression;
        excludedFiltersForN.Expression = Filters.getHierarchyAndWaveFilter(context);
        excludedFiltersForN.HideHeader = true;
        excludedFiltersForN.SubHeaders.Add(responses);
        table.ColumnHeaders.Add(excludedFiltersForN);

        //add previous wave column
        if(DataSourceUtil.getPagePropertyValueFromConfig(context, pageId, 'showPrevWave')) {
            tableBenchmarks_addWaveScoreColumn(context);
        }

        //add Benchmarks from benchmark project
        if(DataSourceUtil.getPagePropertyValueFromConfig(context, pageId, 'BenchmarkProject')) {

            var benchmarks: HeaderBenchmark = new HeaderBenchmark();
            benchmarks.BenchmarkProjectId = DataSourceUtil.getPagePropertyValueFromConfig(context, pageId, 'BenchmarkProject');

            if(DataSourceUtil.getPagePropertyValueFromConfig(context, pageId, 'BenchmarkSet')) {// there's benchmark set

                var selectedBMSet = ParamUtil.GetSelectedCodes(context, 'p_BenchmarkSet'); // can be only one option
                benchmarks.BenchmarkSet = selectedBMSet[0];
            }
            table.ColumnHeaders.Add(benchmarks);
        }

        //add Benchmark as comparison to upper/lower hierarchy levels
        var hierarchyLevelsToCompare = DataSourceUtil.getPagePropertyValueFromConfig(context, pageId, 'HierarchyBasedComparisons');

        for(var i=0; i<hierarchyLevelsToCompare.length; i++) {
            tableBenchmarks_addHierarchyBasedComparison(context, hierarchyLevelsToCompare[i]);
        }

    }

    /*
  * Adds segment with proper filter by hierarchy and base and score column for it
  * @param {object} context: {state: state, report: report, log: log, table: table, user: user}
  * @param {level} top or number of levels to go up
  */
    static function tableBenchmarks_addHierarchyBasedComparison(context, level) {

        var log = context.log;
        var table = context.table;
        var report = context.report;
        var levelSegment: HeaderSegment = new HeaderSegment();
        var parentsList = [];

        levelSegment.DataSourceNodeId = DataSourceUtil.getDsId(context);
        levelSegment.SegmentType = HeaderSegmentType.Expression;
        levelSegment.HideData = true;

        if(level === 'top') {
            parentsList = HierarchyUtil.getParentsForCurrentHierarchyNode(context);
        } else {
            parentsList = HierarchyUtil.getParentsForCurrentHierarchyNode(context, Number(level));
        }

        if(parentsList && parentsList.length>0) {
            levelSegment.Expression = Filters.getHierarchyAndWaveFilter(context, parentsList[parentsList.length-1]['id'], null);
            levelSegment.Label = new Label(report.CurrentLanguage, parentsList[parentsList.length-1]['label']);
        } else {
            return; // no such parent in the hierarchy
        }

        //calc score
        var newHeaders = addScore(context);
        newHeaders[0].Title = levelSegment.Label; // first add header and below segment because otherwise scripted table gives wrong results
        newHeaders[1].SubHeaders.Add(levelSegment);

    }

    /**
     *  gets previous wave column
     *  @param {object} context: {state: state, report: report, log: log, table: table}
     *  @param {Anwser} answer of wave question for code previous to the selected one
     *  @returns {Header}
     */
    static function tableBenchmarks_addWaveScoreColumn(context, prevWave) {

        var report = context.report;
        var table = context.table;
        var log = context.log;
        var prevWave = getPreviousWave(context);
        var newHeaders = addScore(context); // score cols

        var currentHierarchyAndWaveId: HeaderSegment = new HeaderSegment();
        currentHierarchyAndWaveId.DataSourceNodeId = DataSourceUtil.getDsId(context);
        currentHierarchyAndWaveId.SegmentType = HeaderSegmentType.Expression;
        currentHierarchyAndWaveId.HideData = true;

        if(prevWave) { // current wave is not the 1st wave ever
            currentHierarchyAndWaveId.Expression = Filters.getHierarchyAndWaveFilter(context, null, prevWave.Precode);
            newHeaders[0].Title = new Label(report.CurrentLanguage, prevWave.Text);
        } else {
            currentHierarchyAndWaveId.Expression = Filters.getHierarchyAndWaveFilter(context, null, 'noPrevWave');
            newHeaders[0].Title = TextAndParameterUtil.getLabelByKey(context, 'noPrevWave');
        }

        newHeaders[1].SubHeaders.Add(currentHierarchyAndWaveId);
    }

    /*
* get code of previous wave
*  @param {object} context: {state: state, report: report, log: log, table: table}
* @return {Answer} {Code: code, Label: label}
*/

    static function getPreviousWave(context) {

        var log = context.log;
        var waveQ = DataSourceUtil.getSurveyPropertyValueFromConfig(context, 'WaveQuestion');

        if(waveQ) {
            var waves: Answer[] = QuestionUtil.getQuestionAnswers(context, waveQ);
            var currentWave = ParamUtil.GetSelectedCodes(context, 'p_Wave');
            var prevWave;

            if(!currentWave || currentWave.length === 0) {
                throw new Error('PageResults.getPreviousWave: Current wave is not selected.');
            }

            currentWave = currentWave[0];
            var i = 0;

            while(i<waves.length && waves[i].Precode !== currentWave) {
                i++;
            }

            return (i>0 && i<waves.length) ? waves[i-1] : null;     // i==0 -> no previous wave
        }

        return null;
    }


    /*
  * Checks is Benchmark table was build sucessfully, i.e. if benchmark project is defined
  *  @param {object} context: {state: state, report: report, log: log, table: table}
  */

    static function isBenchmarkAvailable(context) {

        var log = context.log;
        var pageId = PageUtil.getCurrentPageIdInConfig(context);
        var benchmarkProject = DataSourceUtil.getPagePropertyValueFromConfig(context, pageId, 'BenchmarkProject');
        var hierarchyLevels = DataSourceUtil.getPagePropertyValueFromConfig(context, pageId, 'HierarchyBasedComparisons');
        var showPrevWave = DataSourceUtil.getPagePropertyValueFromConfig(context, pageId, 'showPrevWave');

        if(benchmarkProject || showPrevWave || (hierarchyLevels && hierarchyLevels.length>0)) {
            return true;
        }
        return false;
    }


    /*
  * Checks is Benchmark table was build sucessfully, i.e. if benchmark project is defined
  *  @param {object} context: {state: state, report: report, log: log, table: table}
  */

    static function table_Benchmarks_hide(context) {
        return !isBenchmarkAvailable(context);
    }

}